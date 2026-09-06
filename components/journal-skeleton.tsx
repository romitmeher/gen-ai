export function JournalCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading reflection entry"
      className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/70 dark:border-white/10 rounded-2xl p-4.5 animate-pulse flex flex-col justify-between h-[152px] shadow-xs"
    >
      <div>
        {/* Header row skeleton */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="w-16 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="w-12 h-3.5 rounded bg-slate-200/80 dark:bg-slate-800" />
          </div>
          <div className="w-10 h-3 rounded bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* Text lines skeleton */}
        <div className="space-y-2">
          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-sm w-full" />
          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-sm w-4/5" />
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="pt-2.5 border-t border-slate-100/80 dark:border-white/5 flex items-center justify-between">
        <div className="h-3 bg-slate-200/70 dark:bg-slate-800 rounded w-2/3" />
        <div className="w-14 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
      <span className="sr-only">Loading reflection records...</span>
    </div>
  );
}

export function JournalHistorySkeletonGroup({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3.5">
      {Array.from({ length: count }).map((_, idx) => (
        <JournalCardSkeleton key={idx} />
      ))}
    </div>
  );
}
