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
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Diff Preview: {versionName}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparing snapshot ({versionDate || 'Saved version'}) with Current Document
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Diff Legend & Stats */}
            <div className="flex items-center space-x-2 text-xs font-semibold mr-2">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                +{diffStats.added} added
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
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
        <div className="flex-1 overflow-y-auto p-8 bg-white">
          <div className="max-w-2xl mx-auto border border-slate-100 rounded-lg p-6 bg-slate-50/50 shadow-inner">
            <div
              id="diff-rendered-content"
              dangerouslySetInnerHTML={{ __html: diffHtml }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Non-destructive: Restoring will record a new snapshot.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium"
          >
            Close Diff
          </button>
        </div>
      </div>
    </div>
  );
}
