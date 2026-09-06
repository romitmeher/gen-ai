'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  ShieldAlert,
  ShieldCheck,
  Code2,
  Play,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  FileCode,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Terminal,
  FileUp,
  Github,
  HardDrive,
  Upload,
} from 'lucide-react';
import { FileImportModal } from '@/components/file-import-modal';

interface Vulnerability {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  owaspCategory: string;
  cwe?: string;
  lineRange: string;
  description: string;
  exploitScenario: string;
  remediation: string;
}

interface AuditResult {
  securityScore: number;
  verdict: 'SECURE' | 'LOW_RISK' | 'VULNERABLE' | 'CRITICAL' | string;
  summary: string;
  vulnerabilities: Vulnerability[];
  remediationPatch: string;
  positiveFindings: string[];
}

const PRESET_VULNERABILITIES = [
  {
    name: 'Hardcoded API Key & Deserialization',
    lang: 'typescript',
    file: 'server/auth.ts',
    code: `import express from 'express';
const app = express();

// ⚠️  DEMO PRESET — INTENTIONAL VULNERABILITY SAMPLE
// CRITICAL FLAW: Hardcoded secret in source code (CWE-798 / OWASP A07)
const GEMINI_API_KEY = "YOUR_API_KEY_HERE"; // Never do this — use Secret Manager

app.post('/api/reflect', (req, res) => {
  // CRITICAL FLAW: Unchecked JSON deserialization & missing JWT validation (CWE-20)
  const userData = req.body;

  // CRITICAL FLAW: Dynamic code execution — Remote Code Execution risk (CWE-95)
  const dynamicCallback = eval(userData.callbackScript);

  res.json({ status: "success", data: dynamicCallback });
});`,
  },
  {
    name: 'Insecure Firestore Rules',
    lang: 'javascript',
    file: 'firestore.rules',
    code: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // CRITICAL FLAW: Zero isolation. Allows any internet user to wipe or read database
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`,
  },
  {
    name: 'SQL & Command Injection',
    lang: 'javascript',
    file: 'controllers/export.js',
    code: `const { exec } = require('child_process');
const db = require('../db');

exports.exportUserData = (req, res) => {
  const userId = req.query.id; // Unvalidated input

  // CRITICAL FLAW: Raw SQL string concatenation
  db.query("SELECT * FROM users WHERE id = '" + userId + "'", (err, result) => {
    // CRITICAL FLAW: Shell command injection
    exec('zip -r /tmp/backup.zip /data/' + req.query.folder, (zipErr) => {
      res.download('/tmp/backup.zip');
    });
  });
};`,
  },
];

export function CodeGuardian() {
  const { user } = useAuth();
  const [code, setCode] = useState(PRESET_VULNERABILITIES[0].code);
  const [filename, setFilename] = useState(PRESET_VULNERABILITIES[0].file);
  const [language, setLanguage] = useState(PRESET_VULNERABILITIES[0].lang);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [copiedPatch, setCopiedPatch] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const loadPreset = (preset: typeof PRESET_VULNERABILITIES[0]) => {
    setCode(preset.code);
    setFilename(preset.file);
    setLanguage(preset.lang);
    setAuditResult(null);
  };

  const runAudit = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const token = await user?.getIdToken?.() || 'sandbox-demo-token';
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, filename, language }),
      });

      if (!res.ok) {
        throw new Error(`Audit scan failed with status ${res.status}`);
      }

      const data = await res.json();
      if (data.audit) {
        setAuditResult(data.audit);
        setModelUsed(data.modelUsed || 'gemini-3.6-flash');
      } else {
        throw new Error('Invalid response structure from auditor');
      }
    } catch (err: any) {
      console.error('Audit error:', err);
      setError(err.message || 'Failed to complete security audit.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyRemediation = () => {
    if (!auditResult?.remediationPatch) return;
    navigator.clipboard.writeText(auditResult.remediationPatch);
    setCopiedPatch(true);
    setTimeout(() => setCopiedPatch(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Preset Selector */}
      <div className="surface-card rounded-xl p-6 border border-white/[0.08]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono-tag text-emerald-400">DevSecOps Code Guardian</span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs font-mono text-zinc-400">OWASP Top 10 Static Analysis</span>
            </div>
            <h2 className="text-xl font-semibold text-white tracking-tight">
              Automated Code & Infrastructure Vulnerability Auditor
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Analyze source code, API routes, or cloud configuration against the OWASP Top 10, CWE flaw matrices, and hardcoded secrets. Generates instant, verifiable remediation patches.
            </p>
          </div>

          <button
            onClick={runAudit}
            disabled={isLoading || !code.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs transition-all shadow-sm disabled:opacity-50 shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                <span>Auditing Codebase...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-zinc-900" />
                <span>Run Security Audit</span>
              </>
            )}
          </button>
        </div>

        {/* 1-Click Vulnerability Presets & Import Actions */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider shrink-0">
              Load Preset:
            </span>
            {PRESET_VULNERABILITIES.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => loadPreset(p)}
                className="text-xs px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.06] hover:border-white/[0.15] transition-all whitespace-nowrap"
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 transition-all font-mono flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-sm font-medium"
              title="Import code from GitHub repository, Google Drive, or local file"
            >
              <FileUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import (GitHub / Drive / Local)</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Editor & Scan Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Code Input Canvas (7 cols) */}
        <div className="lg:col-span-7 surface-card rounded-xl border border-white/[0.15] overflow-hidden flex flex-col h-[560px] shadow-xl">
          {/* Editor Header Bar */}
          <div className="px-4 py-3 bg-black/40 border-b border-white/[0.1] flex items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-zinc-200">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-500 font-semibold uppercase text-[10px]">Target File:</span>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="bg-white/[0.04] border border-white/[0.1] rounded px-2 py-0.5 text-xs font-mono text-zinc-100 focus:outline-hidden focus:border-emerald-500/50"
                placeholder="server.ts"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors flex items-center gap-1"
                title="Import from GitHub, Google Drive, or upload file"
              >
                <FileUp className="w-3 h-3" />
                <span>Import</span>
              </button>
              <button
                type="button"
                onClick={() => setCode('')}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                title="Clear editor contents"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setCode(text);
                  } catch {}
                }}
                className="text-[11px] text-zinc-300 hover:text-white px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors flex items-center gap-1"
                title="Paste from clipboard"
              >
                <span>Paste Code</span>
              </button>
              <span className="text-[10px] text-zinc-500 uppercase font-mono px-2 py-1 rounded bg-white/[0.03]">
                {code.length} chars
              </span>
            </div>
          </div>

          {/* Interactive Code Textarea with Drag & Drop */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const content = ev.target?.result;
                  if (typeof content === 'string') {
                    setCode(content.slice(0, 25000));
                    setFilename(file.name);
                    setAuditResult(null);
                  }
                };
                reader.readAsText(file);
              }
            }}
            className={`relative flex-1 flex flex-col bg-[#07080c] transition-colors ${
              isDragOver ? 'bg-emerald-950/20 border-2 border-dashed border-emerald-500/50' : ''
            }`}
          >
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="// PASTE YOUR SOURCE CODE OR CLOUD CONFIGURATION HERE...
// Or click 'Import' above to load from GitHub / Google Drive / Local Files.
// Or drag and drop any code file directly onto this editor!
//
// Examples:
// - Express / Next.js API route
// - Firestore Security Rules
// - Python FastAPI endpoint
// - Dockerfile or Terraform script"
              className="flex-1 w-full p-4 bg-transparent text-xs font-mono text-zinc-100 placeholder:text-zinc-600 resize-none focus:outline-hidden focus:ring-1 focus:ring-emerald-500/30 leading-relaxed font-normal"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Live Findings & Metrics (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {!auditResult && !isLoading && (
            <div className="surface-card rounded-xl p-8 border border-dashed border-white/[0.1] text-center">
              <Terminal className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
              <h4 className="text-sm font-medium text-zinc-200">Awaiting Code Submission</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                Paste your code or select a preset above, then click &ldquo;Run Security Audit&rdquo; to execute multi-tier vulnerability scanning.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="surface-card rounded-xl p-8 border border-white/[0.08] text-center space-y-3 animate-pulse">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-mono text-zinc-300">Analyzing Abstract Syntax Tree...</p>
              <p className="text-[11px] text-zinc-500">Checking against OWASP Top 10 & CWE Flaw Catalog</p>
            </div>
          )}

          {auditResult && (
            <div className="space-y-4">
              {/* Score & Verdict Banner */}
              <div className="surface-card rounded-xl p-5 border border-white/[0.08]">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider block">
                      Posture Score
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className={`text-3xl font-bold font-mono ${
                        auditResult.securityScore >= 80
                          ? 'text-emerald-400'
                          : auditResult.securityScore >= 50
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}>
                        {auditResult.securityScore}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">/ 100</span>
                    </div>
                  </div>

                  <span className={`font-mono text-xs px-2.5 py-1 rounded-md uppercase font-semibold border ${
                    auditResult.verdict === 'SECURE' || auditResult.verdict === 'LOW_RISK'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {auditResult.verdict}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed pt-2 border-t border-white/[0.06]">
                  {auditResult.summary}
                </p>

                {modelUsed && (
                  <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>Auditor Engine: {modelUsed}</span>
                    <span>{auditResult.vulnerabilities?.length || 0} Flaws Detected</span>
                  </div>
                )}
              </div>

              {/* Vulnerabilities List */}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {auditResult.vulnerabilities?.map((vuln, idx) => (
                  <div
                    key={idx}
                    className="surface-card rounded-lg p-4 border border-white/[0.08] hover:border-white/[0.15] transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          vuln.severity === 'CRITICAL'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                            : vuln.severity === 'HIGH'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}>
                          {vuln.severity}
                        </span>
                        <h5 className="text-xs font-semibold text-zinc-100">{vuln.title}</h5>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500">{vuln.lineRange}</span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">{vuln.description}</p>

                    <div className="p-2 rounded bg-black/40 border border-white/[0.04] text-[11px] text-zinc-400 space-y-1">
                      <div>
                        <span className="font-mono text-red-400 text-[10px] uppercase font-semibold block">Exploit Scenario:</span>
                        <p className="text-zinc-300">{vuln.exploitScenario}</p>
                      </div>
                      <div className="pt-1 border-t border-white/[0.04]">
                        <span className="font-mono text-emerald-400 text-[10px] uppercase font-semibold block">Remediation:</span>
                        <p className="text-zinc-300">{vuln.remediation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Remediation Patch Display */}
      {auditResult?.remediationPatch && (
        <div className="surface-card rounded-xl p-6 border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-zinc-100">
                Automated Remediation Patch (Verified Fix)
              </h3>
            </div>

            <button
              type="button"
              onClick={copyRemediation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-mono transition-all border border-white/[0.08]"
            >
              {copiedPatch ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Patch Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Secure Patch</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded-lg bg-black/60 border border-white/[0.06] text-xs font-mono text-emerald-300/90 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {auditResult.remediationPatch}
          </pre>
        </div>
      )}

      {/* File Import Modal (GitHub / Google Drive / Local Dropzone) */}
      <FileImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={(data) => {
          setCode(data.code);
          setFilename(data.filename);
          setLanguage(data.language);
          setAuditResult(null);
        }}
      />
    </div>
  );
}
