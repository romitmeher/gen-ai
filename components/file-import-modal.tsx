'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  X,
  Github,
  HardDrive,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileCode,
  ArrowRight,
  Shield,
  FileUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (data: { filename: string; language: string; code: string }) => void;
}

const SAMPLE_GITHUB_URLS = [
  {
    name: 'Autonomous Driving Car (Full Python Repo)',
    url: 'https://github.com/Harshit-patil56/Autonomous-Driving-Car',
  },
  {
    name: 'Express.js Auth Controller (JavaScript)',
    url: 'https://github.com/expressjs/express/blob/master/examples/auth/index.js',
  },
  {
    name: 'Firebase Security Rules (Rules v2)',
    url: 'https://raw.githubusercontent.com/firebase/quickstart-js/master/firestore/firestore.rules',
  },
];

export function FileImportModal({ isOpen, onClose, onImportSuccess }: FileImportModalProps) {
  const { user } = useAuth();
  const [importTab, setImportTab] = useState<'github' | 'gdrive' | 'upload'>('github');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleUrlImport = async (targetUrl?: string) => {
    const importUrl = (targetUrl || url).trim();
    if (!importUrl) {
      setError('Please provide a valid URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await user?.getIdToken?.() || 'sandbox-demo-token';
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          url: importUrl,
          type: importTab === 'gdrive' ? 'gdrive' : 'github',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import file');
      }

      onImportSuccess({
        filename: data.filename,
        language: data.language,
        code: data.code,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during file import');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalFileUpload = (file: File) => {
    if (!file) return;
    setError(null);

    // Guard size limit (500KB)
    if (file.size > 500 * 1024) {
      setError('File exceeds the 500KB limit for live security auditing');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        let language = 'typescript';
        const filename = file.name;
        if (filename.endsWith('.py')) language = 'python';
        else if (filename.endsWith('.js') || filename.endsWith('.jsx')) language = 'javascript';
        else if (filename.endsWith('.rules')) language = 'firestore-rules';
        else if (filename.endsWith('.json')) language = 'json';
        else if (filename.endsWith('.yaml') || filename.endsWith('.yml')) language = 'yaml';
        else if (filename.endsWith('.sql')) language = 'sql';
        else if (filename.toLowerCase().includes('dockerfile')) language = 'dockerfile';

        onImportSuccess({
          filename,
          language,
          code: content.slice(0, 25000),
        });
        onClose();
      }
    };
    reader.onerror = () => {
      setError('Failed to read selected local file');
    };
    reader.readAsText(file);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="surface-card rounded-2xl max-w-xl w-full border border-white/[0.12] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-emerald-400">
                <FileUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Import Source Code or Infrastructure
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Load code from GitHub, Google Drive, or upload from your device
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Source Tabs */}
          <div className="px-6 pt-3 pb-0 border-b border-white/[0.08] flex items-center gap-4 bg-white/[0.01]">
            <button
              type="button"
              onClick={() => { setImportTab('github'); setError(null); }}
              className={`pb-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
                importTab === 'github'
                  ? 'border-emerald-400 text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub URL</span>
            </button>

            <button
              type="button"
              onClick={() => { setImportTab('gdrive'); setError(null); }}
              className={`pb-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
                importTab === 'gdrive'
                  ? 'border-emerald-400 text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Google Drive</span>
            </button>

            <button
              type="button"
              onClick={() => { setImportTab('upload'); setError(null); }}
              className={`pb-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2 ${
                importTab === 'upload'
                  ? 'border-emerald-400 text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Local File</span>
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Tab: GitHub Import */}
            {importTab === 'github' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-300 uppercase tracking-wider block">
                    GitHub Repository or Direct File URL
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo or https://github.com/owner/repo/blob/main/..."
                    className="w-full bg-black/50 border border-white/[0.1] focus:border-emerald-500/50 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Supports <strong>full repository URLs</strong> (automatically bundles project code) and direct file URLs.
                  </p>
                </div>

                {/* Quick GitHub Test Presets */}
                <div className="pt-2 border-t border-white/[0.06] space-y-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                    Or Click a Sample GitHub File:
                  </span>
                  <div className="space-y-1.5">
                    {SAMPLE_GITHUB_URLS.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setUrl(sample.url);
                          handleUrlImport(sample.url);
                        }}
                        disabled={isLoading}
                        className="w-full text-left p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] transition-all flex items-center justify-between group text-xs text-zinc-300"
                      >
                        <span className="truncate pr-2 font-mono text-[11px]">{sample.name}</span>
                        <span className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-mono flex items-center gap-1 shrink-0">
                          Import &rarr;
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleUrlImport()}
                    disabled={isLoading || !url.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs transition-all shadow-sm disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-900" />
                        <span>Fetching from GitHub...</span>
                      </>
                    ) : (
                      <>
                        <Github className="w-3.5 h-3.5 text-zinc-900" />
                        <span>Fetch & Import Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Google Drive Import */}
            {importTab === 'gdrive' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-300 uppercase tracking-wider block">
                    Google Drive Shareable Link / Google Doc
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/1A2B3C.../view or docs.google.com/document/d/..."
                    className="w-full bg-black/50 border border-white/[0.1] focus:border-emerald-500/50 rounded-lg px-3.5 py-2 text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Make sure the link sharing is set to &ldquo;Anyone with the link can view&rdquo;. Supports text files, code snippets, and Google Docs.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Anti-SSRF Protection Active</span>
                  </div>
                  <p className="text-[11px]">
                    AEGIS securely validates and exports public text content without passing internal credentials.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleUrlImport()}
                    disabled={isLoading || !url.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs transition-all shadow-sm disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-900" />
                        <span>Fetching from Google Drive...</span>
                      </>
                    ) : (
                      <>
                        <HardDrive className="w-3.5 h-3.5 text-zinc-900" />
                        <span>Import from Drive</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Local File Upload & Drag-and-Drop */}
            {importTab === 'upload' && (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLocalFileUpload(file);
                  }}
                  accept=".ts,.tsx,.js,.jsx,.py,.rules,.json,.yaml,.yml,.sql,.env,.txt,Dockerfile"
                  className="hidden"
                />

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleLocalFileUpload(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-8 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-white/[0.15] bg-white/[0.02] hover:border-white/[0.3] hover:bg-white/[0.04]'
                  }`}
                >
                  <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
                  <h4 className="text-sm font-medium text-zinc-200">
                    Click to select file or drag & drop here
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                    Supports .ts, .js, .py, .rules, .json, .yaml, .sql, Dockerfile (up to 500KB)
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
