'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Loader2,
  Bookmark,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
  FileText,
  ShieldAlert,
  Zap,
  Mic,
  MicOff,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ReflectionPersona, PERSONA_PROMPTS } from '@/lib/gemini-fallback';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const PERSONA_STARTERS: Record<ReflectionPersona, string[]> = {
  systems: [
    'Analyze the failure modes and scalability bottlenecks in my current architecture.',
    'Help me decouple technical dependencies in our upcoming platform release.',
    'Evaluate trade-offs between consistency, availability, and latency for this design.',
    'Review my system boundary assumptions for zero-trust compliance.',
  ],
  executive: [
    'Distill today’s strategic discussion into a 3-bullet decision memo.',
    'Help me prioritize our core quarterly objectives against resource constraints.',
    'Synthesize trade-offs between speed-to-market and technical debt.',
    'Structure an executive briefing on our security posture for leadership.',
  ],
  redteam: [
    'Constructively stress-test the core assumption behind my project plan.',
    'What critical blind spots or second-order consequences am I overlooking?',
    'If this launch fails in 6 months, what is the post-mortem root cause?',
    'Challenge my consensus thinking on our competitive positioning.',
  ],
  velocity: [
    'Isolate the single highest-leverage task to execute on the critical path today.',
    'Deconstruct this ambiguous milestone into 3 atomic, unblockable tasks.',
    'What non-essential scope can we immediately eliminate to ship faster?',
    'Identify the root bottleneck slowing down our decision cycle.',
  ],
};

export function ChatInterface({ initialPrompt = '' }: { initialPrompt?: string }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [persona, setPersona] = useState<ReflectionPersona>('systems');
  const [conversationId, setConversationId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);
  const [lastModelUsed, setLastModelUsed] = useState<string>('gemini-3.6-flash');
  const [isListening, setIsListening] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<{ title: string; summary: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatAbortControllerRef = useRef<AbortController | null>(null);
  const saveAbortControllerRef = useRef<AbortController | null>(null);
  const isSubmittingRef = useRef(false);
  const speechRecognitionRef = useRef<any>(null);

  const [prevPrompt, setPrevPrompt] = useState(initialPrompt);
  if (initialPrompt !== prevPrompt) {
    setPrevPrompt(initialPrompt);
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }

  useEffect(() => {
    if (initialPrompt) {
      textareaRef.current?.focus();
    }
  }, [initialPrompt]);

  useEffect(() => {
    return () => {
      chatAbortControllerRef.current?.abort();
      saveAbortControllerRef.current?.abort();
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Speech Recognition setup (Web Speech API)
  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage('');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  const sendMessage = async (promptToSend?: string) => {
    const textToSend = promptToSend || input;
    if (!textToSend.trim() || isLoading || isSubmittingRef.current) return;

    if (!user) {
      setErrorMessage('Please sign in or launch Sandbox Mode to begin journaling.');
      return;
    }

    isSubmittingRef.current = true;
    const userMessage: Message = { role: 'user', content: textToSend.trim() };
    const optimisticMessages = [...messages, userMessage];

    setMessages(optimisticMessages);
    setInput('');
    setIsLoading(true);
    setErrorMessage('');
    setSaveSuccess(false);
    setSaveFailed(false);

    chatAbortControllerRef.current?.abort();
    chatAbortControllerRef.current = new AbortController();

    try {
      const token = await user.getIdToken();
      if (!token) {
        throw new Error('Authentication session expired. Please sign in again.');
      }

      const res = await fetch('/api/journal/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId,
          message: textToSend.trim(),
          persona,
        }),
        signal: chatAbortControllerRef.current.signal,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to get response from assistant');
      }

      if (data?.conversationId) {
        setConversationId(data.conversationId);
      }

      if (Array.isArray(data?.messages) && data.messages.length > 0) {
        setMessages(data.messages);
      } else if (data?.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      }

      if (data?.modelUsed) {
        setLastModelUsed(data.modelUsed);
      }
    } catch (err: any) {
      if (
        err?.name === 'AbortError' ||
        err?.message?.includes('aborted') ||
        err?.message?.includes('BodyStreamBuffer')
      ) {
        return;
      }
      console.error('Chat error:', err);
      setErrorMessage(err?.message || 'Connection failed. Please check your network and try again.');
      setInput(textToSend);
      setMessages(messages);
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const saveAndSummarize = async () => {
    if (messages.length === 0 || isSaving) return;

    if (!user) {
      setErrorMessage('Please sign in or launch Sandbox Mode to summarize your reflection.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setSaveFailed(false);

    saveAbortControllerRef.current?.abort();
    saveAbortControllerRef.current = new AbortController();

    try {
      const token = await user.getIdToken();
      if (!token) {
        throw new Error('Authentication session expired. Please sign in again.');
      }

      const res = await fetch('/api/journal/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId,
          messages,
        }),
        signal: saveAbortControllerRef.current.signal,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to summarize conversation');
      }

      setSaveSuccess(true);
      if (data?.summary) {
        setSessionSummary({
          title: data.title || 'Brainstorming Session',
          summary: data.summary,
        });
      }
    } catch (err: any) {
      if (
        err?.name === 'AbortError' ||
        err?.message?.includes('aborted') ||
        err?.message?.includes('BodyStreamBuffer')
      ) {
        return;
      }
      console.error('Summarize error:', err);
      setSaveFailed(true);
      setErrorMessage(err?.message || 'Failed to generate session summary. Please retry.');
    } finally {
      setIsSaving(false);
    }
  };

  const startNewSession = () => {
    setMessages([]);
    setConversationId('');
    setSessionSummary(null);
    setSaveSuccess(false);
    setSaveFailed(false);
    setErrorMessage('');
  };


  const personaIcons: Record<ReflectionPersona, any> = {
    systems: Layers,
    executive: FileText,
    redteam: ShieldAlert,
    velocity: Zap,
  };

  return (
    <div className="flex flex-col surface-card border border-white/[0.08] rounded-xl shadow-lg h-[680px] overflow-hidden">
      {/* Workspace Header */}
      <div className="px-5 py-3.5 bg-white/[0.02] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
          <div>
            <h2 className="text-xs font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
              <span>Strategic Thought Partner & Drafting Canvas</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
                {lastModelUsed}
              </span>
            </h2>
            <p className="text-[11px] text-zinc-500">
              {messages.length === 0
                ? 'Select an advisory lens below to begin drafting'
                : `${messages.length} exchanges recorded • Cryptographically Isolated`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <button
                type="button"
                onClick={startNewSession}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
                title="Start a fresh conversation loop"
              >
                New Session
              </button>

              <motion.button
                layout
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                type="button"
                onClick={saveAndSummarize}
                disabled={isSaving || saveSuccess}
                aria-label="Save and summarize conversation"
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
                  saveSuccess
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : saveFailed
                    ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30'
                    : 'bg-zinc-100 hover:bg-white text-zinc-900 font-semibold'
                }`}
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-3.5 h-3.5" />
                ) : saveFailed ? (
                  <RefreshCw className="w-3.5 h-3.5" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5" />
                )}
                <span>
                  {isSaving
                    ? 'Summarizing with Gemini...'
                    : saveSuccess
                    ? 'Summarized & Saved'
                    : saveFailed
                    ? 'Retry Summarize'
                    : 'Save & Summarize'}
                </span>
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Session Summary Banner */}
      {sessionSummary && (
        <div className="px-5 py-3 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-200 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-emerald-300 block">{sessionSummary.title}</span>
            <p className="text-zinc-300 leading-relaxed text-[11px]">{sessionSummary.summary}</p>
          </div>
        </div>
      )}

      {/* Reflection Persona Switcher */}
      <div className="px-5 py-2 bg-white/[0.01] border-b border-white/[0.06] flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 mr-1 flex items-center gap-1">
          <Shield className="w-3 h-3 text-zinc-400" />
          Lens:
        </span>
        {(Object.keys(PERSONA_PROMPTS) as ReflectionPersona[]).map((p) => {
          const Icon = personaIcons[p];
          const isSelected = persona === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPersona(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isSelected
                  ? 'bg-white/[0.12] text-zinc-100 border border-white/[0.2] shadow-sm'
                  : 'bg-white/[0.02] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] border border-white/[0.05]'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{PERSONA_PROMPTS[p].name}</span>
            </button>
          );
        })}
      </div>

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-transparent">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-md mx-auto">
            <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3 text-zinc-300">
              <Sparkles className="w-5 h-5" />
            </div>

            <h3 className="text-sm font-semibold text-zinc-200 mb-1">
              Active Strategy & Drafting Canvas
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-5">
              Draft your thoughts with {PERSONA_PROMPTS[persona].name}. Your reflections are mathematically isolated in Firestore and analyzed via the Gemini Fallback Ladder.
            </p>

            {/* Prompt suggestions matching persona */}
            <div className="w-full space-y-2 text-left">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                Suggested {PERSONA_PROMPTS[persona].name} Prompts
              </span>
              {PERSONA_STARTERS[persona].map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.15] hover:bg-white/[0.05] text-xs text-zinc-300 transition-all flex items-center justify-between group"
                >
                  <span className="truncate pr-2">{prompt}</span>
                  <span className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-mono flex-shrink-0">
                    Draft &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-4.5 py-3 text-xs leading-relaxed shadow-2xs ${
                    msg.role === 'user'
                      ? 'bg-slate-900 dark:bg-indigo-600 text-white rounded-br-xs'
                      : 'bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/70 dark:border-slate-800'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap font-normal">{msg.content}</div>
                  ) : (
                    <div className="prose prose-xs max-w-none text-slate-800 dark:text-slate-200">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl rounded-bl-xs px-4 py-2.5 flex items-center gap-2.5 text-slate-500 dark:text-slate-400 border border-slate-200/70 dark:border-slate-800 shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              <span className="text-xs font-medium">Reflecting with {PERSONA_PROMPTS[persona].name}...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error & Persistence Failure Banner */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-rose-500/10 backdrop-blur-md border-t border-rose-500/20 px-4 py-2 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {saveFailed && (
              <button
                type="button"
                onClick={saveAndSummarize}
                className="font-medium underline hover:text-rose-900 ml-2"
              >
                Retry
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div className="p-3 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/60 dark:border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={
              isListening
                ? 'Listening... speak your draft aloud'
                : 'Draft architectural ideas, strategic challenges, or retro notes...'
            }
            aria-label="Reflection composer input"
            className={`w-full bg-black/40 border ${
              isListening
                ? 'border-red-500 ring-2 ring-red-500/20'
                : 'border-white/[0.1] focus:border-white/[0.25]'
            } rounded-lg px-3.5 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden resize-none min-h-[44px] max-h-[120px] transition-all`}
            rows={1}
          />

          {/* Voice dictation toggle */}
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            aria-label={isListening ? 'Stop voice recording' : 'Start voice dictation'}
            className={`h-11 w-11 flex-shrink-0 rounded-lg flex items-center justify-center transition-all ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse shadow-md'
                : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] border border-white/[0.08]'
            }`}
            title={isListening ? 'Click to finish speaking' : 'Speak draft aloud'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Submit button */}
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="h-11 w-11 flex-shrink-0 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            aria-label="Send reflection message"
          >
            <Send className="w-4 h-4 text-zinc-900" />
          </button>
        </form>

        <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-zinc-500 font-mono">
          <span>Return to send • Shift + Return for new line</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <Shield className="w-3 h-3" />
            OWASP LLM01 Guardrails Active
          </span>
        </div>
      </div>
    </div>
  );
}
