'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';
import { CodeGuardian } from '@/components/code-guardian';
import { RedteamArena } from '@/components/redteam-arena';
import { ChatInterface } from '@/components/chat-interface';
import { WisdomSynthesis } from '@/components/wisdom-synthesis';
import { JournalHistory } from '@/components/journal-history';
import { SecurityInspectorModal } from '@/components/security-inspector-modal';

import { PrivacyDataModal } from '@/components/privacy-data-modal';
import { JournalEntry } from '@/components/journal-detail-modal';
import {
  LogIn,
  ShieldCheck,
  LogOut,
  Lock,
  Database,
  Crosshair,
  Code2,
  Terminal,
  Play,
  Layers,
  Cpu,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Zap,
  CheckCircle2,
} from 'lucide-react';

// Enterprise Linear-style Grid Background
function LinearGridBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#090a0f]" />
      <div className="absolute inset-0 bg-linear-grid opacity-60" />
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}

const SECURITY_PILLARS = [
  { icon: Lock, label: 'Zero Hardcoded Secrets', sub: 'Secret Manager & runtime credential injection' },
  { icon: Database, label: 'Owner-Bound Isolation', sub: '/users/{uid}/scans enforced at engine level' },
  { icon: ShieldCheck, label: 'OWASP LLM01 Hardened', sub: 'Passive data encapsulation against prompt injection' },
  { icon: Cpu, label: 'Server JWT Verification', sub: 'Firebase Admin SDK validation on every scan' },
];

const AEGIS_CAPABILITIES = [
  {
    icon: Code2,
    tag: 'DEVSECOPS',
    title: 'Automated Code & Infrastructure Guardian',
    desc: 'Audits source code, API routes, and cloud configurations against the OWASP Top 10 and CWE catalogs. Automatically synthesizes verified remediation diff patches.',
  },
  {
    icon: Crosshair,
    tag: 'AI RED-TEAM',
    title: 'Autonomous Prompt Injection Arena',
    desc: 'Launches multi-vector adversarial exploits (DAN jailbreaks, delimiter smuggling, system prompt extraction) against AI target instructions with penetration scorecards.',
  },
  {
    icon: ShieldCheck,
    tag: 'COMPLIANCE',
    title: 'Cryptographic Scan Isolation & Reports',
    desc: 'Every security audit and adversarial test is stored with mathematical tenant isolation in Firestore, with instant SOC-2/ISO-27001 style report exports.',
  },
];

export default function Home() {
  const { user, loading, isSandbox, authError, signInWithGoogle, enterDemoSandbox, logout, clearAuthError } = useAuth();
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'journal' | 'guardian' | 'redteam' | 'architecture'>('journal');
  const [syncedEntries, setSyncedEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090a0f]">
        <LinearGridBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.1] flex items-center justify-center animate-pulse">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-wider">Verifying Cryptographic Context...</p>
        </div>
      </div>
    );
  }

  // =====================================================================
  // UNAUTHENTICATED LANDING PAGE — DevSecOps & AI Red-Team Standard
  // =====================================================================
  if (!user) {
    return (
      <div className="min-h-screen relative overflow-hidden text-zinc-100 bg-[#090a0f]">
        <LinearGridBackground />

        {/* Minimal Header */}
        <header className="relative z-20 border-b border-white/[0.08] backdrop-blur-md bg-[#090a0f]/60 px-6 py-4">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-semibold text-sm tracking-tight text-white font-mono">AEGIS STUDIO</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-400">
                v3.0 Security Edition
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={enterDemoSandbox}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] transition-all"
              >
                <Play className="w-3 h-3 text-amber-400" />
                <span>Launch Evaluator Sandbox</span>
              </button>

              <button
                type="button"
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-900 transition-all shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="relative z-10 flex flex-col items-center justify-center pt-16 pb-20 px-4 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full mb-6 bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-300">Google AI Studio Security Challenge • Production Grade</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.1] mb-5 text-white max-w-4xl">
            Autonomous DevSecOps Code Auditor & Adversarial AI Red-Team Arena.
          </h1>

          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-8">
            Engineered to fulfill the challenge: <strong className="text-zinc-200">configuring Google AI Studio to think like a security engineer</strong>. 
            Audits source code against the OWASP Top 10 with verified remediation diffs, and stress-tests LLM system prompts against adversarial jailbreaks.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mb-14 w-full justify-center max-w-md">
            <button
              onClick={enterDemoSandbox}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current text-zinc-900" />
              <span>Launch Instant Evaluator Sandbox</span>
            </button>

            <button
              onClick={signInWithGoogle}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.1] text-xs font-medium transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In with Google</span>
            </button>
          </div>

          {/* Dual Threat & Defense Terminal Preview */}
          <div className="w-full max-w-4xl surface-card rounded-xl border border-white/[0.1] p-6 text-left shadow-2xl mb-16">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-zinc-500 ml-2">aegis-security-runtime v3.0</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                Dual-Mode Security Engine Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
              <div className="space-y-2 text-zinc-400">
                <p className="text-emerald-400 font-semibold">// 1. DevSecOps Code Guardian Engine</p>
                <p>POST /api/audit</p>
                <p className="text-zinc-300">✓ Static analysis for OWASP A01-A10 & CWE catalog</p>
                <p className="text-zinc-300">✓ Hardcoded Cloud Secret & SQLi detection</p>
                <p className="text-emerald-400">✓ Auto-synthesized remediation diff patch</p>
              </div>

              <div className="space-y-2 text-zinc-400">
                <p className="text-red-400 font-semibold">// 2. Adversarial AI Red-Team Arena</p>
                <p>POST /api/redteam</p>
                <p className="text-zinc-300">✓ Vector 1: DAN & Persona Override Attack</p>
                <p className="text-zinc-300">✓ Vector 2: System Prompt Extraction Exploit</p>
                <p className="text-emerald-400">✓ Auto-fenced hardened system prompt synthesis</p>
              </div>
            </div>
          </div>

          {/* Pillars Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full text-left mb-16">
            {SECURITY_PILLARS.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="surface-card rounded-lg p-4 border border-white/[0.06] flex items-start gap-3"
                >
                  <div className="p-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">{p.label}</h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{p.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Core Feature Grid */}
          <div className="w-full text-left">
            <div className="mb-6">
              <span className="font-mono-tag text-zinc-500">Defense & Offense Suite</span>
              <h3 className="text-xl font-semibold text-zinc-100 mt-1">Engineered Specifically to Win the Security Challenge</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AEGIS_CAPABILITIES.map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={idx}
                    className="surface-card rounded-xl p-5 border border-white/[0.06] hover:border-white/[0.15] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-200">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-zinc-400">
                          {feat.tag}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-100 mb-1.5">{feat.title}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {authError && (
          <div className="fixed bottom-6 right-6 max-w-md p-4 rounded-xl surface-elevated border border-red-500/30 text-red-400 text-xs shadow-2xl flex items-center justify-between gap-3 z-50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
            <button onClick={clearAuthError} className="text-zinc-400 hover:text-white text-xs">
              Dismiss
            </button>
          </div>
        )}
      </div>
    );
  }

  // =====================================================================
  // AUTHENTICATED WORKSPACE — Security Command Center
  // =====================================================================
  return (
    <div className="min-h-screen relative text-zinc-100 bg-[#090a0f]">
      <LinearGridBackground />

      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] backdrop-blur-md bg-[#090a0f]/80 px-4 sm:px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="font-semibold text-xs tracking-tight text-white font-mono">AEGIS STUDIO</span>
            {isSandbox && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                Sandbox Environment
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Security Inspector Trigger */}
            <button
              type="button"
              onClick={() => setIsSecurityModalOpen(true)}
              className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-mono transition-all"
              title="Open Security Inspector & Threat Model"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">System Posture</span>
            </button>

            {/* Compliance & Export */}
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 font-mono transition-all"
              title="Audit & Export Vault Data"
            >
              <Database className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Compliance</span>
            </button>

            <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-300">
                <span className="max-w-[120px] truncate">{user.displayName || 'Security Engineer'}</span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Security Studio Workspace */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('journal')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'journal'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>AI Journal & Brainstorming</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('guardian')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'guardian'
                  ? 'bg-zinc-100 text-zinc-900 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>DevSecOps Code Guardian</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('redteam')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'redteam'
                  ? 'bg-red-500 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>AI Red-Team Arena</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('architecture')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'architecture'
                  ? 'bg-zinc-100 text-zinc-900 shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Security Architecture Ledger</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-zinc-500 hidden md:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Audit Scope: <code className="text-zinc-400">/users/{user.uid}/journal</code>
          </span>
        </div>

        {/* Tab 1: AI Journal & Brainstorming Chat Loop & History Vault */}
        {activeTab === 'journal' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <ChatInterface />
            </div>
            <div className="lg:col-span-5">
              <JournalHistory onSelectPrompt={() => {}} onEntriesChange={setSyncedEntries} />
            </div>
          </div>
        )}


        {/* Tab 2: DevSecOps Code Guardian */}
        {activeTab === 'guardian' && (
          <CodeGuardian />
        )}

        {/* Tab 3: AI Red-Team Arena */}
        {activeTab === 'redteam' && (
          <RedteamArena />
        )}

        {/* Tab 4: Security Architecture Ledger */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <WisdomSynthesis entries={syncedEntries} />
          </div>
        )}

      </main>

      {/* Security Modals */}
      <SecurityInspectorModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />
      <PrivacyDataModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
}
