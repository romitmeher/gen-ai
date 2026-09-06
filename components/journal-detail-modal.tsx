'use client';

import { useState } from 'react';
import { X, Calendar, Sparkles, Trash2, MessageSquare, AlertCircle, Brain, Lightbulb, Compass, Heart, HelpCircle, Zap, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { getMoodTheme } from '@/lib/mood-colors';
import { PerspectiveShift } from '@/components/perspective-shift';

export interface JournalEntry {
  id: string;
  createdAt: string;
  updatedAt?: string;
  summary: string;
  mood: string;
  color: string;
  reflectionPrompt: string;
  tags?: string[];
  cognitivePatterns?: string[];
  growthOpportunity?: string;
  sentimentScore?: number;
  persona?: string;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface JournalDetailModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
  onContinuePrompt: (prompt: string) => void;
  onDeleteEntry: (id: string) => Promise<void>;
}

export function JournalDetailModal({
  entry,
  onClose,
  onContinuePrompt,
  onDeleteEntry,
}: JournalDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPerspective, setShowPerspective] = useState(false);

  if (!entry) return null;

  const theme = getMoodTheme(entry.mood);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteEntry(entry.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete entry:', err);
      setIsDeleting(false);
    }
  };

  const getPersonaIcon = (p?: string) => {
    if (p === 'stoic') return Compass;
    if (p === 'socratic') return HelpCircle;
    if (p === 'incubator') return Zap;
    return Heart;
  };

  const PersonaIcon = getPersonaIcon(entry.persona);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: theme.dotColor }}
              />
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
              >
                {entry.mood || 'Reflective'}
              </span>

              {entry.persona && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                  <PersonaIcon className="w-3 h-3" />
                  <span className="capitalize">{entry.persona} Guide</span>
                </span>
              )}

              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(entry.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close reflection details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 dark:text-slate-300">
            {/* Summary Block */}
            <div className="bg-slate-50/80 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4.5 space-y-2.5 shadow-2xs">
              <div id="modal-title" className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Gemini Distillation Summary
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                {entry.summary}
              </p>
              {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {entry.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-400 shadow-2xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Cognitive Patterns Radar Block */}
            {Array.isArray(entry.cognitivePatterns) && entry.cognitivePatterns.length > 0 && (
              <div className="bg-purple-50/70 dark:bg-purple-950/20 backdrop-blur-md border border-purple-200/60 dark:border-purple-800/30 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-semibold text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Identified Cognitive &amp; Thinking Patterns
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {entry.cognitivePatterns.map((pat, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800/50 text-purple-800 dark:text-purple-300 shadow-2xs"
                    >
                      {pat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Growth Opportunity & Reframing */}
            {entry.growthOpportunity && (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/20 backdrop-blur-md border border-emerald-200/60 dark:border-emerald-800/30 rounded-2xl p-4 space-y-1.5">
                <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Constructive Cognitive Reframing
                </div>
                <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                  {entry.growthOpportunity}
                </p>
              </div>
            )}

            {/* AI Actionable Prompt Block */}
            {entry.reflectionPrompt && (
              <div className="bg-indigo-50/70 dark:bg-indigo-950/30 backdrop-blur-md border border-indigo-200/60 dark:border-indigo-500/20 rounded-2xl p-4.5 space-y-2">
                <div className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Next-Day Inquiry
                </div>
                <p className="text-xs text-indigo-950 dark:text-indigo-200 italic leading-relaxed">
                  &ldquo;{entry.reflectionPrompt}&rdquo;
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onContinuePrompt(entry.reflectionPrompt);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl transition-all shadow-xs"
                  >
                    <span>Continue In Chat</span>
                  </button>
                </div>
              </div>
            )}

            {/* Perspective Shift */}
            <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.12)' }}>
              {!showPerspective ? (
                <button
                  type="button"
                  onClick={() => setShowPerspective(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-purple-400 transition-all hover:text-purple-300"
                  style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>See It Differently — 3 AI Perspectives</span>
                </button>
              ) : (
                <PerspectiveShift
                  text={entry.summary || ''}
                  context={entry.messages?.map(m => `${m.role}: ${m.content}`).join('\n').slice(0, 1000)}
                  onClose={() => setShowPerspective(false)}
                />
              )}
            </div>

            {/* Conversation Transcript */}
            {Array.isArray(entry.messages) && entry.messages.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  Dialogue Transcript ({entry.messages.length} messages)
                </div>
                <div className="space-y-3 pt-1">
                  {entry.messages.map((m, idx) => {
                    const isUser = m.role === 'user';
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] text-slate-400 mb-1 px-1 font-medium">
                          {isUser ? 'You' : 'Gemini'}
                        </span>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                            isUser
                              ? 'bg-slate-900 dark:bg-indigo-600 text-white rounded-br-xs shadow-xs'
                              : 'bg-slate-100/90 dark:bg-slate-800/80 backdrop-blur-md text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/70 dark:border-slate-700'
                          }`}
                        >
                          <div className="markdown-body">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1.5 transition-colors rounded px-1.5 py-1"
                aria-label="Delete this reflection record"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Record</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Confirm deletion?
                </span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-2.5 py-1 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-2xs"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors shadow-2xs"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
