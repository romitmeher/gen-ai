'use client';

import { useMemo } from 'react';
import { JournalEntry } from '@/components/journal-detail-modal';
import { Sparkles, TrendingUp, Flame, Brain, HeartHandshake } from 'lucide-react';
import { getMoodTheme } from '@/lib/mood-colors';

interface MoodAnalyticsProps {
  entries: JournalEntry[];
}

export function MoodAnalytics({ entries }: MoodAnalyticsProps) {
  // Compute analytics
  const analytics = useMemo(() => {
    if (entries.length === 0) return null;

    const moodCounts: Record<string, number> = {};
    const patternCounts: Record<string, number> = {};
    let totalSentiment = 0;
    let sentimentCount = 0;

    entries.forEach((entry: any) => {
      const mood = entry.mood || 'Reflective';
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;

      if (Array.isArray(entry.cognitivePatterns)) {
        entry.cognitivePatterns.forEach((p: string) => {
          patternCounts[p] = (patternCounts[p] || 0) + 1;
        });
      }

      if (typeof entry.sentimentScore === 'number') {
        totalSentiment += entry.sentimentScore;
        sentimentCount++;
      }
    });

    const averageSentiment = sentimentCount > 0 ? (totalSentiment / sentimentCount).toFixed(2) : '0.25';

    // Top moods sorted
    const sortedMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);

    // Top cognitive patterns
    const sortedPatterns = Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Reflection Streak calculation
    const dates = entries
      .map((e) => new Date(e.createdAt).toDateString())
      .filter((v, i, a) => a.indexOf(v) === i);

    const streak = dates.length;

    return {
      totalEntries: entries.length,
      sortedMoods,
      sortedPatterns,
      averageSentiment,
      streak,
    };
  }, [entries]);

  if (!analytics || entries.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/70 dark:border-slate-800 text-center space-y-2">
        <Sparkles className="w-6 h-6 text-indigo-500 mx-auto" />
        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          Cognitive Analytics &amp; Mood Radar
        </h4>
        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
          Save your first few reflections to unlock real-time cognitive pattern analysis, emotional valence trends, and streak tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Streak</span>
            <Flame className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100">
            {analytics.streak} {analytics.streak === 1 ? 'Day' : 'Days'}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Consistent reflection</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Reflections</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100">
            {analytics.totalEntries}
          </div>
          <span className="text-[10px] text-slate-400">Distilled by Gemini</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Valence</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100">
            {Number(analytics.averageSentiment) >= 0 ? '+' : ''}{analytics.averageSentiment}
          </div>
          <span className="text-[10px] text-slate-400">Emotional balance</span>
        </div>
      </div>

      {/* Mood Distribution */}
      <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <HeartHandshake className="w-3.5 h-3.5 text-indigo-500" />
            <span>Emotional Spectrum Distribution</span>
          </h4>
          <span className="text-[10px] text-slate-400">{analytics.sortedMoods.length} Moods Recorded</span>
        </div>

        <div className="space-y-2">
          {analytics.sortedMoods.map(([mood, count]) => {
            const percentage = Math.round((count / analytics.totalEntries) * 100);
            const theme = getMoodTheme(mood);

            return (
              <div key={mood} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: theme.dotColor }}
                    />
                    {mood}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {count} ({percentage}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: theme.dotColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cognitive Pattern Radar */}
      {analytics.sortedPatterns.length > 0 && (
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5">
          <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-purple-500" />
            <span>Observed Cognitive &amp; Thinking Patterns</span>
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {analytics.sortedPatterns.map(([pattern, count]) => (
              <span
                key={pattern}
                className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/40 flex items-center gap-1.5 shadow-2xs"
              >
                <span>{pattern}</span>
                <span className="font-mono text-[10px] text-purple-400 bg-white/80 dark:bg-purple-900/40 px-1.5 py-0.2 rounded-full">
                  {count}x
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
