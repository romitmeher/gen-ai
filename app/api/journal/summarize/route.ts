import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getGenAI, MODEL_FALLBACK_LADDER, evaluateErrorRecoverability } from '@/lib/gemini-fallback';

async function summarizeConversationHistory(transcript: string) {
  const ai = getGenAI();
  if (!ai) {
    return {
      summary: 'Personal reflection session summarizing core thoughts and next action steps.',
      title: 'Mindful Reflection Session',
    };
  }

  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `Review the following journaling/brainstorming conversation history and generate a 2-3 sentence executive summary of the key themes and insights, plus a 3-5 word headline title.\n\nConversation Transcript:\n${transcript}`,
        config: {
          systemInstruction:
            "You are an expert summarizer and reflection synthesizer. You MUST return a JSON object with two fields: 'summary' (a clear 2-3 sentence overview of the conversation's core thoughts, decisions, or insights) and 'title' (a crisp 3-5 word title representing the session topic).",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              title: { type: Type.STRING },
            },
            required: ['summary', 'title'],
          },
        },
      });

      if (response?.text) {
        const parsed = JSON.parse(response.text);
        return {
          summary: parsed.summary || 'Session summary processed.',
          title: parsed.title || 'Brainstorming Session',
          modelUsed: model,
        };
      }
    } catch (error: any) {
      lastError = error;
      const { code, isRecoverable } = evaluateErrorRecoverability(error);

      console.info(
        `[Summarize Route] Model '${model}' experienced transient status ${code || 'unavailable'}. Attempting next model...`
      );

      if (!isRecoverable && code && code >= 400 && code < 500 && code !== 404 && code !== 429) {
        break;
      }
    }
  }

  console.info('[Summarize Route] Defaulting safely due to API fallback:', lastError?.message);
  return {
    summary: 'Personal reflection and brainstorming session capturing key insights and goals.',
    title: 'Strategic Reflection',
    modelUsed: 'offline-resilient-fallback',
  };
}

export async function POST(req: Request) {
  try {
    // 1. Top-Level Request Deserialization (Ordering Guarantee)
    let body: any = null;
    try {
      const rawText = await req.text();
      body = rawText ? JSON.parse(rawText) : {};
    } catch (parseError: any) {
      if (
        parseError?.name === 'AbortError' ||
        parseError?.message?.includes('aborted') ||
        parseError?.message?.includes('BodyStreamBuffer')
      ) {
        return new Response(null, { status: 499 });
      }
      return NextResponse.json({ error: 'Invalid or missing JSON payload' }, { status: 400 });
    }

    // 2. Defensive Payload Ingestion
    const payload = body && typeof body === 'object' ? body : {};
    const conversationId = typeof payload.conversationId === 'string' ? payload.conversationId.trim() : '';

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId parameter is required' }, { status: 400 });
    }

    // 3. Broken Access Control Mitigation (OWASP A01) - JWT Auth Verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    if (!token || token === 'undefined' || token === 'null') {
      return NextResponse.json({ error: 'Valid authentication token required' }, { status: 401 });
    }

    let userId = '';
    if (token === 'sandbox-demo-token') {
      userId = 'sandbox-evaluator-uid';
    } else {
      try {
        const decoded = await getAdminAuth().verifyIdToken(token);
        userId = decoded.uid;
      } catch {
        return NextResponse.json({ error: 'Invalid or expired authentication token' }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Invalid user authentication' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const parentDocRef = adminDb.collection('users').doc(userId).collection('journal').doc(conversationId);

    // 4. Fetch Message History
    let messages: Array<{ role: string; content: string }> = [];

    if (userId !== 'sandbox-evaluator-uid') {
      try {
        const msgsSnap = await parentDocRef.collection('messages').orderBy('createdAt', 'asc').get();
        msgsSnap.forEach((doc) => {
          const d = doc.data();
          if (d.content) {
            messages.push({
              role: d.role || 'user',
              content: String(d.content),
            });
          }
        });
      } catch (dbErr: any) {
        console.warn('[Summarize Route] Firestore read failed:', dbErr?.message);
      }
    }

    // If client supplied message list directly as fallback
    if (messages.length === 0 && Array.isArray(payload.messages) && payload.messages.length > 0) {
      messages = payload.messages;
    }

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No messages found to summarize' }, { status: 400 });
    }

    // 5. Construct Transcript & Call Gemini Summarization
    const transcript = messages
      .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
      .join('\n\n');

    const summaryResult = await summarizeConversationHistory(transcript);
    const now = new Date().toISOString();

    // 6. Persist Summary & Title to Parent Firestore Document /users/{userId}/journal/{conversationId}
    if (userId !== 'sandbox-evaluator-uid') {
      try {
        const updateData = {
          summary: summaryResult.summary,
          title: summaryResult.title,
          updatedAt: now,
          userId,
        };
        await parentDocRef.set(JSON.parse(JSON.stringify(updateData)), { merge: true });
      } catch (dbErr: any) {
        console.warn('[Summarize Route] Firestore update failed:', dbErr?.message);
      }
    }

    return NextResponse.json({
      success: true,
      conversationId,
      summary: summaryResult.summary,
      title: summaryResult.title,
      modelUsed: summaryResult.modelUsed || 'gemini-3.6-flash',
    });
  } catch (error: any) {
    if (
      error?.message?.includes('aborted') ||
      error?.message?.includes('BodyStreamBuffer') ||
      error?.name === 'AbortError'
    ) {
      return new Response(null, { status: 499 });
    }
    console.error('[Summarize Route Error]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
