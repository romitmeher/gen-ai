'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { Calendar, Search, ArrowUpRight, BookOpen, Filter, Sparkles, Brain, Compass, Heart, HelpCircle, Zap, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { JournalDetailModal, JournalEntry } from '@/components/journal-detail-modal';
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
    color: '#10b981',
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
    color: '#3b82f6',
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
    color: '#8b5cf6',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('All');
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    if (!user) return;

    if (user.isSandbox) {
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
              color: data.color || '#10b981',
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

  const availableMoods = useMemo(() => {
    const moods = new Set<string>();
    entries.forEach((e) => {
      if (e.mood) moods.add(e.mood);
    });
    return ['All', ...Array.from(moods)];
  }, [entries]);

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

  return (
    <div className="surface-card rounded-xl border border-white/[0.12] p-5 space-y-4 shadow-xl flex flex-col h-[680px]">
      {/* Header & Search Bar */}
      <div className="space-y-3 pb-3 border-b border-white/[0.08] shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Reflections Vault</h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
              {entries.length}
            </span>
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reflections, tags, moods..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-black/40 border border-white/[0.1] text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-emerald-500/50 transition-all font-mono"
          />
        </div>

        {/* Mood Filter Pills */}
        {availableMoods.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] text-zinc-500 uppercase font-mono shrink-0">Mood:</span>
            {availableMoods.map((mood) => {
              const isSelected = selectedMood === mood;
              return (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                  }`}
                >
                  {mood}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Vault List Container */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading ? (
          <div className="space-y-3 p-4">
            <div className="h-16 bg-white/[0.04] rounded-lg animate-pulse" />
            <div className="h-16 bg-white/[0.04] rounded-lg animate-pulse" />
            <div className="h-16 bg-white/[0.04] rounded-lg animate-pulse" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-2">
            <Calendar className="w-8 h-8 text-zinc-600 stroke-[1.5]" />
            <p className="text-xs font-medium text-zinc-300">
              {entries.length === 0 ? 'No saved reflections yet' : 'No matching entries'}
            </p>
            <p className="text-[11px] text-zinc-500 max-w-xs">
              {entries.length === 0
                ? 'Brainstorm in the chat canvas and click "Save & Summarize" to save your session here.'
                : 'Try adjusting your search filter.'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredEntries.map((entry) => {
              const theme = getMoodTheme(entry.mood);
              const PersonaIcon = getPersonaIcon(entry.persona);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  key={entry.id}
                  onClick={() => setActiveEntry(entry)}
                  className="p-3.5 rounded-lg bg-black/40 hover:bg-black/60 border border-white/[0.08] hover:border-emerald-500/30 transition-all cursor-pointer group space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: theme.dotColor || '#10b981' }}
                      />
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                        {entry.mood || 'Reflective'}
                      </span>
                      {entry.tags?.[0] && (
                        <span className="text-[10px] font-mono text-zinc-500">#{entry.tags[0]}</span>
                      )}
                    </div>

                    <span className="text-[10px] font-mono text-zinc-500">
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed font-normal line-clamp-2">
                    {entry.summary}
                  </p>

                  <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span className="truncate flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{entry.reflectionPrompt || 'Saved Reflection'}</span>
                    </span>
                    <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0 flex items-center gap-0.5">
                      <span>View</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

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
