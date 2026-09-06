export interface MoodTheme {
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  glowColor: string;
  accentBg: string;
}

export const MOOD_PALETTE: Record<string, MoodTheme> = {
  Positive: {
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-500/30',
    dotColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.15)',
    accentBg: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30',
  },
  Reflective: {
    badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBorder: 'border-indigo-500/30',
    dotColor: '#6366F1',
    glowColor: 'rgba(99, 102, 241, 0.15)',
    accentBg: 'hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30',
  },
  Challenged: {
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeText: 'text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-500/30',
    dotColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.15)',
    accentBg: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/30',
  },
  Grateful: {
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-500/30',
    dotColor: '#F43F5E',
    glowColor: 'rgba(244, 63, 94, 0.15)',
    accentBg: 'hover:bg-rose-50/50 dark:hover:bg-rose-950/30',
  },
  Calm: {
    badgeBg: 'bg-teal-500/10 dark:bg-teal-500/20',
    badgeText: 'text-teal-700 dark:text-teal-300',
    badgeBorder: 'border-teal-500/30',
    dotColor: '#14B8A6',
    glowColor: 'rgba(20, 184, 166, 0.15)',
    accentBg: 'hover:bg-teal-50/50 dark:hover:bg-teal-950/30',
  },
  Energetic: {
    badgeBg: 'bg-orange-500/10 dark:bg-orange-500/20',
    badgeText: 'text-orange-700 dark:text-orange-300',
    badgeBorder: 'border-orange-500/30',
    dotColor: '#F97316',
    glowColor: 'rgba(249, 115, 22, 0.15)',
    accentBg: 'hover:bg-orange-50/50 dark:hover:bg-orange-950/30',
  },
  Uncertain: {
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    badgeText: 'text-purple-700 dark:text-purple-300',
    badgeBorder: 'border-purple-500/30',
    dotColor: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.15)',
    accentBg: 'hover:bg-purple-50/50 dark:hover:bg-purple-950/30',
  },
};

export const DEFAULT_MOOD_THEME: MoodTheme = {
  badgeBg: 'bg-slate-500/10 dark:bg-slate-500/20',
  badgeText: 'text-slate-700 dark:text-slate-300',
  badgeBorder: 'border-slate-500/30',
  dotColor: '#64748B',
  glowColor: 'rgba(100, 116, 139, 0.15)',
  accentBg: 'hover:bg-slate-50/50 dark:hover:bg-slate-950/30',
};

export function getMoodTheme(mood?: string): MoodTheme {
  if (!mood) return DEFAULT_MOOD_THEME;
  const normalized = Object.keys(MOOD_PALETTE).find(
    (k) => k.toLowerCase() === mood.trim().toLowerCase()
  );
  return normalized ? MOOD_PALETTE[normalized] : DEFAULT_MOOD_THEME;
}
