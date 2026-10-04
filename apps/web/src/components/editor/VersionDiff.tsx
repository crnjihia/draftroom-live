'use client';

import React, { useMemo } from 'react';
import * as Y from 'yjs';
import {
  extractTextFromYDoc,
  createYDocFromState,
  generateDiffHtml,
  computeWordDiff,
} from '@/lib/yjs/diff';
import { ArrowLeft, RotateCcw, GitCompare, CheckCircle2 } from 'lucide-react';

interface VersionDiffProps {
  currentYdoc: Y.Doc;
  versionState: string | Uint8Array;
  versionName: string;
  versionDate?: string;
  onRestore: () => void;
  onClose: () => void;
}

/**
 * Version diff component: compares historical version state against current Y.Doc
 * and renders a visual diff in read-only mode.
 */
export default function VersionDiff({
  currentYdoc,
  versionState,
  versionName,
  versionDate,
  onRestore,
  onClose,
}: VersionDiffProps) {
  // Reconstruct past doc state
  const pastDoc = useMemo(() => {
    return createYDocFromState(versionState);
  }, [versionState]);

  // Extract texts
  const currentText = useMemo(() => extractTextFromYDoc(currentYdoc), [currentYdoc]);
  const pastText = useMemo(() => extractTextFromYDoc(pastDoc), [pastDoc]);

  // Compute word-level diffs
  const diffHtml = useMemo(() => {
    return generateDiffHtml(pastText, currentText);
  }, [pastText, currentText]);

  const diffStats = useMemo(() => {
    const segments = computeWordDiff(pastText, currentText);
    let added = 0;
    let removed = 0;
    segments.forEach((s) => {
      if (s.type === 'added' && s.value.trim()) added++;
      if (s.type === 'removed' && s.value.trim()) removed++;
    });
    return { added, removed };
  }, [pastText, currentText]);

  return (
    <div
      id="version-diff-modal"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Diff Preview: {versionName}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comparing snapshot ({versionDate || 'Saved version'}) with Current Document
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Diff Legend & Stats */}
            <div className="flex items-center space-x-2 text-xs font-semibold mr-2">
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                +{diffStats.added} added
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                -{diffStats.removed} removed
              </span>
            </div>

            {/* Non-destructive Restore Button */}
            <button
              id="btn-restore-version"
              onClick={onRestore}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore this Version</span>
            </button>
          </div>
        </div>

        {/* Diff Content Viewer (Read-only) */}
        <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-900">
          <div className="max-w-2xl mx-auto border border-slate-100 dark:border-slate-800 rounded-lg p-6 bg-slate-50/50 dark:bg-slate-950/60 shadow-inner">
            <div
              id="diff-rendered-content"
              dangerouslySetInnerHTML={{ __html: diffHtml }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span>Non-destructive: Restoring will record a new snapshot.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            Close Diff
          </button>
        </div>
      </div>
    </div>
  );
}
