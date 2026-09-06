'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { JournalEntry } from '@/components/journal-detail-modal';
import {
  Brain,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  FileText,
  Loader2,
  RefreshCw,
  Clock,
  Layers,
  CheckSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WisdomSynthesisProps {
  entries: JournalEntry[];
}

interface StrategicSynthesisData {
  executiveBriefing: string;
  decisions: Array<{
    title: string;
    rationale: string;
    tradeOff: string;
    status: 'LOCKED' | 'PROVISIONAL' | string;
  }>;
  actionItems: Array<{
    task: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | string;
    impact: string;
  }>;
  strategicRisks: Array<{
    risk: string;
    impact: string;
    mitigation: string;
  }>;
  topicClusters: Array<{
    topic: string;
    weight: number;
    status: string;
  }>;
  trajectorySummary: string;
}

export function WisdomSynthesis({ entries }: WisdomSynthesisProps) {
  const { user } = useAuth();
  const [data, setData] = useState<StrategicSynthesisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<number, boolean>>({});

  const toggleTask = (idx: number) => {
    setCompletedTasks((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const runSynthesis = async () => {
    if (entries.length === 0) return;
    setIsLoading(true);
    setError(null);

    try {
      const token = await user?.getIdToken?.() || 'sandbox-demo-token';
      const res = await fetch('/api/wisdom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entries }),
      });

      if (!res.ok) {
        throw new Error(`Analysis failed with status ${res.status}`);
      }

      const result = await res.json();
      if (result.synthesis) {
        setData(result.synthesis);
        setModelUsed(result.modelUsed || 'gemini-3.6-flash');
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err: any) {
      console.error('Synthesis error:', err);
      setError(err.message || 'Failed to synthesize journal archive.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Executive Command Header */}
      <div className="surface-card rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-zinc-200">
              <Layers className="w-4 h-4" />
            </div>
            <span className="font-mono-tag text-zinc-400">Executive Intelligence</span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-400 font-mono">{entries.length} Records Scoped</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
            Strategic Synthesis & Decisions Ledger
          </h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Cross-document cognitive intelligence extracting solidified decisions, critical execution items, and architectural trade-offs across your archive.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={runSynthesis}
            disabled={isLoading || entries.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                <span>Analyzing Archive...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-zinc-900" />
                <span>{data ? 'Re-Synthesize Intelligence' : 'Generate Strategic Synthesis'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!data && !isLoading && (
        <div className="surface-card rounded-xl p-12 text-center border-dashed border-white/[0.1]">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-zinc-400">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-medium text-zinc-200">No Synthesis Generated Yet</h3>
          <p className="text-sm text-zinc-400 mt-1.5 max-w-md mx-auto">
            Click &ldquo;Generate Strategic Synthesis&rdquo; above to run multi-document analysis on your {entries.length} reflections and produce an executive briefing.
          </p>
        </div>
      )}

      {/* Active Synthesis Dashboard */}
      {data && (
        <div className="space-y-6">
          {/* Executive Briefing Card */}
          <div className="surface-card rounded-xl p-6 border-l-2 border-l-emerald-500/70">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="font-mono-tag text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Executive Briefing
              </span>
              {modelUsed && (
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-400">
                  {modelUsed}
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
              {data.executiveBriefing}
            </p>
            {data.trajectorySummary && (
              <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-start gap-2.5">
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-300 font-medium italic">
                  &ldquo;{data.trajectorySummary}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Decisions Ledger & Action Items Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Confirmed Decisions */}
            <div className="surface-card rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tag text-zinc-300">Decisions Solidified</span>
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300">
                      {data.decisions?.length || 0}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">Immutable Records</span>
                </div>

                <div className="space-y-3">
                  {data.decisions?.map((dec, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <h4 className="text-sm font-medium text-zinc-200">{dec.title}</h4>
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                            dec.status === 'LOCKED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-700/30 text-zinc-400 border border-zinc-700/50'
                          }`}
                        >
                          {dec.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mb-2 leading-normal">{dec.rationale}</p>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 pt-1.5 border-t border-white/[0.04]">
                        <span className="font-mono text-zinc-400">Trade-Off:</span>
                        <span className="truncate">{dec.tradeOff}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* High-Leverage Action Items */}
            <div className="surface-card rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tag text-zinc-300">High-Leverage Commitments</span>
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300">
                      {data.actionItems?.length || 0}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500">Critical Path</span>
                </div>

                <div className="space-y-3">
                  {data.actionItems?.map((act, idx) => {
                    const isDone = completedTasks[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleTask(idx)}
                        className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                          isDone
                            ? 'bg-white/[0.01] border-white/[0.04] opacity-60'
                            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                        }`}
                      >
                        <button
                          type="button"
                          className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center transition-colors border ${
                            isDone
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                              : 'border-white/[0.2] hover:border-white/[0.4]'
                          }`}
                        >
                          {isDone && <CheckSquare className="w-3.5 h-3.5" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p
                              className={`text-sm font-medium ${
                                isDone ? 'line-through text-zinc-500' : 'text-zinc-200'
                              }`}
                            >
                              {act.task}
                            </p>
                            <span
                              className={`font-mono text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold shrink-0 ${
                                act.priority === 'CRITICAL'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : act.priority === 'HIGH'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}
                            >
                              {act.priority}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400">{act.impact}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Strategic Risk Matrix & Domain Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Risk & Dependency Matrix (2 cols) */}
            <div className="surface-card rounded-xl p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span className="font-mono-tag text-zinc-300">Strategic Risk & Dependency Matrix</span>
                </div>
                <span className="text-xs text-zinc-500">Proactive Mitigation</span>
              </div>

              <div className="space-y-3">
                {data.strategicRisks?.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-sm font-medium text-zinc-200">{r.risk}</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/[0.04] text-xs">
                      <div>
                        <span className="font-mono text-zinc-500 block text-[10px] uppercase">
                          Downstream Impact
                        </span>
                        <span className="text-zinc-300">{r.impact}</span>
                      </div>
                      <div>
                        <span className="font-mono text-emerald-400/80 block text-[10px] uppercase">
                          Mitigation Strategy
                        </span>
                        <span className="text-zinc-300">{r.mitigation}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Domain Clusters (1 col) */}
            <div className="surface-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono-tag text-zinc-300">Domain Distribution</span>
                <span className="text-xs text-zinc-500">Weight</span>
              </div>

              <div className="space-y-4">
                {data.topicClusters?.map((t, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-zinc-300">{t.topic}</span>
                      <span className="font-mono text-zinc-400">{t.weight}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full bg-zinc-300 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, t.weight)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500 mt-1 block uppercase">
                      Status: {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
