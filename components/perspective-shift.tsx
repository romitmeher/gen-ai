'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  RotateCcw,
  Target,
  ShieldAlert,
  Loader2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Perspective {
  title: string;
  insight: string;
  actionable: string;
}

interface PerspectiveShiftProps {
  text: string;
  context?: string;
  onClose?: () => void;
}

const PERSPECTIVE_CONFIGS = [
  {
    key: 'inversion',
    icon: RotateCcw,
    label: 'Premise Inversion',
    badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    iconColor: 'text-amber-400',
    subtext: 'Invert the foundational assumption',
  },
  {
    key: 'systems',
    icon: Target,
    label: 'Systems Leverage',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    iconColor: 'text-emerald-400',
    subtext: 'Isolate constraints & 80/20 leverage',
  },
  {
    key: 'secondOrder',
    icon: ShieldAlert,
    label: 'Second-Order Risk',
    badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    iconColor: 'text-blue-400',
    subtext: '6-12 month downstream ripple effects',
  },
];

export function PerspectiveShift({ text, context, onClose }: PerspectiveShiftProps) {
  const { user } = useAuth();
  const [perspectives, setPerspectives] = useState<Perspective[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);

  const generatePerspectives = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await user?.getIdToken?.() || 'sandbox-demo-token';
      const res = await fetch('/api/perspective', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, context }),
      });

      if (!res.ok) {
        throw new Error(`Analysis failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.perspectives && Array.isArray(data.perspectives)) {
        setPerspectives(data.perspectives);
        setModelUsed(data.modelUsed || 'gemini-3.6-flash');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Perspective shift error:', err);
      setError(err.message || 'Failed to generate strategic lenses.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="surface-card rounded-xl p-6 border border-white/[0.1] my-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono-tag text-zinc-400">Strategic Decision Engine</span>
            {modelUsed && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-400">
                {modelUsed}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-zinc-100">
            Multi-Lens Strategic Stress-Test
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Deconstruct this reflection through 3 rigorous analytical models to uncover blind spots and high-leverage moves.
          </p>
        </div>

        {!perspectives && (
          <button
            onClick={generatePerspectives}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-medium transition-all shadow-sm shrink-0 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-900" />
                <span>Analyzing Lenses...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
                <span>Run Strategic Analysis</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="p-5 rounded-lg bg-white/[0.02] border border-white/[0.06] animate-pulse space-y-3"
            >
              <div className="h-4 w-24 bg-white/[0.06] rounded" />
              <div className="h-5 w-3/4 bg-white/[0.06] rounded" />
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-white/[0.04] rounded" />
                <div className="h-3 w-5/6 bg-white/[0.04] rounded" />
              </div>
              <div className="h-8 w-full bg-white/[0.04] rounded mt-4" />
            </div>
          ))}
        </div>
      )}

      {/* Results 3-card grid */}
      {perspectives && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {perspectives.map((p, idx) => {
            const config = PERSPECTIVE_CONFIGS[idx] || PERSPECTIVE_CONFIGS[0];
            const Icon = config.icon;

            return (
              <div
                key={idx}
                className="p-5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${config.badgeClass}`}>
                        {config.label}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-zinc-100 mb-2 leading-snug">
                    {p.title}
                  </h4>

                  <p className="text-xs text-zinc-300 leading-relaxed mb-4">
                    {p.insight}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.06]">
                  <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
                    Immediate High-ROI Intervention
                  </span>
                  <p className="text-xs text-zinc-200 font-medium flex items-start gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{p.actionable}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
