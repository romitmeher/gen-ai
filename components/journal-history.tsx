'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { Calendar, Search, ArrowUpRight, BookOpen, Filter, Sparkles, Brain, Compass, Heart, HelpCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { JournalDetailModal, JournalEntry } from '@/components/journal-detail-modal';
import { JournalHistorySkeletonGroup } from '@/components/journal-skeleton';
import { getMoodTheme } from '@/lib/mood-colors';

interface JournalHistoryProps {
  onSelectPrompt: (prompt: string) => void;
  onEntriesChange?: (entries: JournalEntry[]) => void;
}

const INITIAL_SANDBOX_ENTRIES: JournalEntry[] = [
  {
    id: 'demo-entry-1',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    summary: 'Reflected on balancing security rigor with rapid development speed. Decided that building security-first upfront prevents catastrophic refactoring later.',
    mood: 'Focused',
    color: '#0071E3',
    reflectionPrompt: 'What is one recurring assumption you can test today?',
    tags: ['Architecture', 'Security', 'Discipline'],
    cognitivePatterns: ['Growth Mindset', 'Rational Clarity'],
    growthOpportunity: 'Trust the deliberate architectural choices made under pressure.',
    sentimentScore: 0.6,
    persona: 'stoic',
    messages: [
      { role: 'user', content: 'I was tempted to take shortcuts on auth today to build features faster. But I chose to enforce owner-bound Firestore rules first.' },
      { role: 'assistant', content: 'As Epictetus teaches, the quality of your foundation determines whether your structure stands when the storms hit. Prioritizing integrity over speed is true mastery.' }
    ]
  },
  {
    id: 'demo-entry-2',
    createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    summary: 'Expressed gratitude for supportive teammates during an intense hackathon sprint. Recognized feelings of impostor syndrome and reframed them into curiosity.',
    mood: 'Grateful',
    color: '#34C759',
    reflectionPrompt: 'Who can you express appreciation to tomorrow?',
    tags: ['Gratitude', 'Teamwork', 'Mindfulness'],
    cognitivePatterns: ['Gratitude Focus', 'Impostor Syndrome Reframed'],
    growthOpportunity: 'Acknowledge your unique contributions to the team with pride.',
    sentimentScore: 0.8,
    persona: 'empathetic',
    messages: [
      { role: 'user', content: 'I felt overwhelmed by how smart everyone is, but then we had a breakthrough together.' },
      { role: 'assistant', content: 'It takes vulnerability to admit when we feel small, but that same humility allows you to connect and create something greater together.' }
    ]
  },
  {
    id: 'demo-entry-3',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    summary: 'Deconstructed a complex feature backlog into 3 high-impact milestones, eliminating 4 non-critical distractions.',
    mood: 'Motivated',
    color: '#AF52DE',
    reflectionPrompt: 'What single task, if completed, makes everything else easier?',
    tags: ['Strategy', 'Execution', 'Prioritization'],
    cognitivePatterns: ['Strategic Focus', 'Noise Elimination'],
    growthOpportunity: 'Protect your deep work windows from low-priority interruptions.',
    sentimentScore: 0.5,
    persona: 'incubator',
    messages: [
      { role: 'user', content: 'My to-do list was 20 items long. I could not decide what to tackle first.' },
      { role: 'assistant', content: 'Let us apply the 80/20 principle. Which 2 items create 80% of the value for the demo?' }
    ]
  }
];

export function JournalHistory({ onSelectPrompt, onEntriesChange }: JournalHistoryProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('All');
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    if (!user) return;

    if (user.isSandbox) {
      // Sandbox mode: Fetch from export endpoint or load demo set
      const fetchSandbox = async () => {
        try {
          const res = await fetch('/api/journal/export?format=json', {
            headers: { Authorization: 'Bearer sandbox-demo-token' },
          });
          const data = await res.json().catch(() => null);
          if (data && Array.isArray(data.entries) && data.entries.length > 0) {
            setEntries(data.entries);
            onEntriesChange?.(data.entries);
          } else {
            setEntries(INITIAL_SANDBOX_ENTRIES);
            onEntriesChange?.(INITIAL_SANDBOX_ENTRIES);
          }
        } catch {
          setEntries(INITIAL_SANDBOX_ENTRIES);
          onEntriesChange?.(INITIAL_SANDBOX_ENTRIES);
        } finally {
          setLoading(false);
        }
      };

      fetchSandbox();
      return;
    }

    // Standard Firebase Auth mode: Fetch from Firestore using owner-isolated paths (journals & journal)
    const journalsRef = collection(db, 'users', user.uid, 'journals');
    const journalRef = collection(db, 'users', user.uid, 'journal');

    const q1 = query(journalsRef, orderBy('createdAt', 'desc'));
    const q2 = query(journalRef, orderBy('createdAt', 'desc'));

    const entriesMap = new Map<string, JournalEntry>();

    const updateCombined = () => {
      const combined = Array.from(entriesMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setEntries(combined);
      onEntriesChange?.(combined);
      setLoading(false);
    };

    const unsub1 = onSnapshot(
      q1,
      (snapshot) => {
        snapshot.forEach((docSnap) => {
          entriesMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as JournalEntry);
        });
        updateCombined();
      },
      (err) => {
        console.warn('Journals snapshot error:', err);
        setLoading(false);
      }
    );

    const unsub2 = onSnapshot(
      q2,
      (snapshot) => {
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.summary || data.title) {
            entriesMap.set(docSnap.id, {
              id: docSnap.id,
              createdAt: data.createdAt || data.updatedAt || new Date().toISOString(),
              summary: data.summary || data.title || 'Multi-turn reflection session',
              mood: data.mood || 'Reflective',
              color: data.color || '#0071E3',
              reflectionPrompt: data.title ? `Topic: ${data.title}` : 'Saved Session',
              tags: Array.isArray(data.tags) ? data.tags : ['Brainstorming'],
              cognitivePatterns: Array.isArray(data.cognitivePatterns) ? data.cognitivePatterns : ['Reflective Thought'],
              growthOpportunity: data.growthOpportunity || 'Review past insights to guide current decisions.',
              sentimentScore: typeof data.sentimentScore === 'number' ? data.sentimentScore : 0.4,
              ...data,
            } as JournalEntry);
          }
        });
        updateCombined();
      },
      (err) => {
        console.warn('Journal snapshot error:', err);
        setLoading(false);
      }
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, [user, onEntriesChange]);


  // Available unique moods for filtering
  const availableMoods = useMemo(() => {
    const moods = new Set<string>();
    entries.forEach((e) => {
      if (e.mood) moods.add(e.mood);
    });
    return ['All', ...Array.from(moods)];
  }, [entries]);

  // Filtered entries based on search and mood
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesMood = selectedMood === 'All' || entry.mood === selectedMood;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesMood;

      const summaryMatch = entry.summary?.toLowerCase().includes(q);
      const promptMatch = entry.reflectionPrompt?.toLowerCase().includes(q);
      const tagsMatch = entry.tags?.some((t) => t.toLowerCase().includes(q));
      const moodMatch = entry.mood?.toLowerCase().includes(q);

      return matchesMood && (summaryMatch || promptMatch || tagsMatch || moodMatch);
    });
  }, [entries, searchQuery, selectedMood]);

  const handleDeleteEntry = async (id: string) => {
    if (!user) return;
    if (user.isSandbox) {
      const updated = entries.filter((e) => e.id !== id);
      setEntries(updated);
      onEntriesChange?.(updated);
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'journals', id));
    } catch (err) {
      console.error('Failed to delete doc:', err);
      throw err;
    }
  };

  const getPersonaIcon = (p?: string) => {
    if (p === 'stoic') return Compass;
    if (p === 'socratic') return HelpCircle;
    if (p === 'incubator') return Zap;
    return Heart;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
        <JournalHistorySkeletonGroup count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="bg-rose-500/10 backdrop-blur-md border border-rose-500/20 rounded-2xl p-5 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span>Reflections Vault</span>
            <span className="text-xs font-normal text-slate-400">({entries.length})</span>
          </h2>
        </div>

        {/* Search input with focus-visible accessibility */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reflections, tags, moods..."
            aria-label="Search reflection archive"
            className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Mood Filter Pills */}
      {availableMoods.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs" role="toolbar" aria-label="Filter reflections by mood">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            Mood:
          </span>
          {availableMoods.map((mood) => {
            const isSelected = selectedMood === mood;
            const moodTheme = mood !== 'All' ? getMoodTheme(mood) : null;
            return (
              <button
                key={mood}
                onClick={() => setSelectedMood(mood)}
                aria-pressed={isSelected}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs scale-[1.02]'
                    : 'bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                }`}
              >
                {mood !== 'All' && moodTheme && (
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                    style={{ backgroundColor: moodTheme.dotColor }}
                  />
                )}
                {mood}
              </button>
            );
          })}
        </div>
      )}

      {/* Zero State */}
      {filteredEntries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/70 dark:border-slate-800 rounded-2xl p-8 text-center space-y-2 shadow-2xs"
        >
          <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto stroke-[1.5]" />
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {entries.length === 0 ? 'No reflections saved yet' : 'No matching entries found'}
          </p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {entries.length === 0
              ? 'Converse with Gemini and click "Save Reflection" to distill and preserve your session.'
              : 'Try clearing your search query or selecting "All" moods.'}
          </p>
        </motion.div>
      ) : (
        /* Animated Reflection Cards Grid */
        <motion.div layout className="grid grid-cols-1 gap-3.5">
          <AnimatePresence mode="popLayout">
            {filteredEntries.map((entry) => {
              const theme = getMoodTheme(entry.mood);
              const PersonaIcon = getPersonaIcon(entry.persona);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  key={entry.id}
                  onClick={() => setActiveEntry(entry)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Reflection from ${new Date(entry.createdAt).toLocaleDateString()}, mood: ${entry.mood || 'Reflective'}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveEntry(entry);
                    }
                  }}
                  className="bg-white/80 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/40 rounded-2xl p-4 transition-all hover:shadow-md cursor-pointer group relative flex flex-col justify-between"
                >
                  <div>
                    {/* Meta row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0 transition-transform group-hover:scale-125"
                          style={{ backgroundColor: theme.dotColor }}
                        />
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                        >
                          {entry.mood || 'Reflective'}
                        </span>

                        {entry.persona && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                            <PersonaIcon className="w-2.5 h-2.5" />
                            <span className="capitalize">{entry.persona}</span>
                          </span>
                        )}

                        {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            #{entry.tags[0]}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-400">
                        {new Date(entry.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal line-clamp-3 mb-2.5">
                      {entry.summary}
                    </p>

                    {/* Cognitive Pattern Pill (if present) */}
                    {Array.isArray(entry.cognitivePatterns) && entry.cognitivePatterns.length > 0 && (
                      <div className="flex items-center gap-1 mb-2.5">
                        <Brain className="w-2.5 h-2.5 text-purple-500 flex-shrink-0" />
                        <span className="text-[10px] text-purple-600 dark:text-purple-300 font-medium truncate">
                          {entry.cognitivePatterns[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Reflection Prompt / Continue action */}
                  {entry.reflectionPrompt && (
                    <div className="pt-2 border-t border-slate-100/90 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                        <span className="truncate">&ldquo;{entry.reflectionPrompt}&rdquo;</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPrompt(entry.reflectionPrompt);
                        }}
                        className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 flex-shrink-0"
                        title="Continue this thought in chat"
                      >
                        <span>Continue</span>
                        <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Reflection Detail & Transcript Modal */}
      <JournalDetailModal
        entry={activeEntry}
        onClose={() => setActiveEntry(null)}
        onContinuePrompt={onSelectPrompt}
        onDeleteEntry={handleDeleteEntry}
      />
    </div>
  );
}
