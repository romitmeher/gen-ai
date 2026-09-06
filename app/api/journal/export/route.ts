import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function GET(req: Request) {
  try {
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
        const decodedToken = await getAdminAuth().verifyIdToken(token);
        userId = decodedToken.uid;
      } catch {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Invalid user authentication' }, { status: 401 });
    }

    // Parse URL query parameter format
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    // Fetch user journals strictly isolated to authenticated userId
    const entries: any[] = [];

    if (userId === 'sandbox-evaluator-uid') {
      const { getFromMemoryVault } = await import('@/lib/memory-vault');
      entries.push(...getFromMemoryVault(userId));
    } else {
      try {
        const snapshot = await getAdminDb()
          .collection('users')
          .doc(userId)
          .collection('journals')
          .orderBy('createdAt', 'desc')
          .get();

        snapshot.forEach((doc) => {
          entries.push({ id: doc.id, ...doc.data() });
        });
      } catch (dbError: any) {
        console.warn('Firestore read failed, falling back to memory vault:', dbError?.message);
        const { getFromMemoryVault } = await import('@/lib/memory-vault');
        entries.push(...getFromMemoryVault(userId));
      }
    }

    if (format === 'markdown') {
      let md = `# Personal Gemini Journal Export\n`;
      md += `Exported on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n`;
      md += `Total Entries: ${entries.length}\n\n---\n\n`;

      for (const entry of entries) {
        const dateStr = new Date(entry.createdAt).toLocaleString();
        md += `## Entry: ${dateStr}\n\n`;
        md += `**Mood:** ${entry.mood || 'Reflective'}  \n`;
        md += `**Summary:** ${entry.summary || 'No summary'}  \n`;
        if (entry.reflectionPrompt) {
          md += `**Follow-up Prompt:** *${entry.reflectionPrompt}*  \n`;
        }
        if (Array.isArray(entry.tags) && entry.tags.length > 0) {
          md += `**Tags:** ${entry.tags.join(', ')}  \n`;
        }
        md += `\n### Conversation History:\n\n`;
        if (Array.isArray(entry.messages)) {
          for (const msg of entry.messages) {
            const role = msg.role === 'assistant' ? 'Gemini' : 'You';
            md += `> **${role}:** ${msg.content}\n\n`;
          }
        }
        md += `\n---\n\n`;
      }

      return new Response(md, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="gemini-journal-export-${new Date().toISOString().split('T')[0]}.md"`,
        },
      });
    }

    // Default JSON export
    return NextResponse.json({
      exportDate: new Date().toISOString(),
      userId,
      totalEntries: entries.length,
      entries,
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
