'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { ShieldCheck, Download, Trash2, X, AlertTriangle, FileText, FileCode, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PrivacyDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataPurged?: () => void;
}

export function PrivacyDataModal({ isOpen, onClose, onDataPurged }: PrivacyDataModalProps) {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleExport = async (format: 'markdown' | 'json') => {
    if (!user) return;
    setIsExporting(format);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/journal/export?format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to export journal entries');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gemini-journal-export-${new Date().toISOString().split('T')[0]}.${format === 'markdown' ? 'md' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatusMessage(`Successfully downloaded ${format.toUpperCase()} export.`);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('BodyStreamBuffer')) {
        return;
      }
      console.error('Export error:', err);
      setErrorMessage(err?.message || 'Export failed. Please try again.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    setIsDeleting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/journal/delete-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to purge journal records');
      }

      setStatusMessage('All personal journal records have been permanently deleted.');
      setConfirmDelete(false);
      if (onDataPurged) onDataPurged();
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('BodyStreamBuffer')) {
        return;
      }
      console.error('Purge error:', err);
      setErrorMessage(err?.message || 'Purge failed. Please check permissions.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-900">
              <ShieldCheck className="w-5 h-5 text-[#0071E3]" />
              <h2 className="text-base font-semibold tracking-tight">Privacy & Data Governance</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 text-sm text-slate-600">
            {/* Status Notifications */}
            {statusMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Architecture Disclosure */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
                Isolated Storage Guarantee
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your entries and conversational transcripts are stored strictly in your dedicated path (<code className="bg-slate-200/70 px-1 py-0.5 rounded text-[11px] text-slate-800">/users/{user?.uid}/journals</code>). Access is cryptographically enforced by server-side Firebase Security Rules.
              </p>
              <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside pt-1">
                <li>No cross-user access or directory listing is permitted.</li>
                <li>Gemini API keys are maintained exclusively in secure server memory.</li>
                <li>Your journal is never shared with third-party tracking services.</li>
              </ul>
            </div>

            {/* Export Section */}
            <div className="space-y-3">
              <h4 className="font-medium text-slate-900 text-xs">Export Your Personal Data</h4>
              <p className="text-xs text-slate-500">
                Download an unencrypted offline backup of your journal history and multi-turn reflections.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleExport('markdown')}
                  disabled={isExporting !== null}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <FileText className="w-4 h-4 text-[#0071E3]" />
                  {isExporting === 'markdown' ? 'Exporting...' : 'Markdown (.md)'}
                </button>
                <button
                  onClick={() => handleExport('json')}
                  disabled={isExporting !== null}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <FileCode className="w-4 h-4 text-emerald-600" />
                  {isExporting === 'json' ? 'Exporting...' : 'JSON (.json)'}
                </button>
              </div>
            </div>

            {/* Deletion Section */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <h4 className="font-medium text-slate-900 text-xs">Permanent Data Deletion</h4>
              <p className="text-xs text-slate-500">
                Permanently purge all journal documents and conversational histories from Cloud Firestore.
              </p>

              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2 py-2 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All Journal Data
                </button>
              ) : (
                <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-800 font-medium">
                      This action is irreversible. All journal reflections and transcripts will be permanently removed.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleDeleteAll}
                      disabled={isDeleting}
                      className="py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? 'Purging records...' : 'Yes, Delete Everything'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="py-1.5 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-white text-xs font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
