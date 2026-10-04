'use client';

import React, { useState, useEffect } from 'react';
import * as Y from 'yjs';
import { Socket } from 'socket.io-client';
import { AwarenessUser, NamedVersionData } from '@draftroom/shared';
import VersionDiff from './VersionDiff';
import {
  History,
  X,
  Plus,
  Clock,
  GitCommit,
  GitCompare,
  RotateCcw,
  Tag,
  CheckCircle2,
} from 'lucide-react';

interface VersionHistoryProps {
  documentId: string;
  ydoc: Y.Doc;
  currentUser: AwarenessUser;
  socket: Socket | null;
  onClose: () => void;
}

export default function VersionHistory({
  documentId,
  ydoc,
  currentUser,
  socket,
  onClose,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<NamedVersionData[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [selectedVersionForDiff, setSelectedVersionForDiff] =
    useState<NamedVersionData | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load versions from API
  useEffect(() => {
    async function fetchVersions() {
      try {
        const res = await fetch(`/api/versions?documentId=${documentId}`);
        if (res.ok) {
          const data = await res.json();
          setVersions(data);
        }
      } catch (err) {
        console.warn('[Version History] Error fetching versions:', err);
      }
    }
    fetchVersions();
  }, [documentId]);

  // Listen to socket notifications for versions created by peers
  useEffect(() => {
    if (!socket) return;

    const handleVersionCreated = (version: NamedVersionData) => {
      setVersions((prev) => {
        if (prev.some((v) => v.id === version.id)) return prev;
        return [version, ...prev];
      });
    };

    socket.on('versionCreated', handleVersionCreated);
    return () => {
      socket.off('versionCreated', handleVersionCreated);
    };
  }, [socket]);

  // Create a named version snapshot
  const handleSaveNamedVersion = async (presetName?: string) => {
    const name = (presetName || newVersionName).trim();
    if (!name) return;

    const state = Y.encodeStateAsUpdate(ydoc);
    const base64State = Buffer.from(state).toString('base64');

    const newVersion: NamedVersionData = {
      id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      documentId,
      name,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
      ydocState: base64State,
    };

    setVersions((prev) => [newVersion, ...prev]);
    setNewVersionName('');
    setIsCreating(false);

    // Broadcast to room
    socket?.emit('namedVersionCreated', { docId: documentId, version: newVersion });

    // Show feedback
    setStatusMessage(`Saved snapshot: "${name}"`);
    setTimeout(() => setStatusMessage(null), 3000);

    try {
      await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVersion),
      });
    } catch (e) {
      console.warn('[Version History] Error saving version:', e);
    }
  };

  // Restore a version non-destructively: creates a new snapshot and applies update to Y.Doc
  const handleRestore = async (version: NamedVersionData) => {
    if (!version.ydocState) return;

    try {
      const binaryState = Buffer.from(version.ydocState, 'base64');
      // Apply the state update to current Y.Doc
      Y.applyUpdate(ydoc, binaryState);

      // Save a new restore point version
      const restoreName = `Restored from "${version.name}"`;
      await handleSaveNamedVersion(restoreName);

      setSelectedVersionForDiff(null);
      setStatusMessage(`Restored "${version.name}" successfully!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('[Version History] Error restoring version:', err);
    }
  };

  return (
    <>
      <aside
        id="version-history-sidebar"
        className="w-80 h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col z-30 shadow-lg transition-colors duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
              Version History
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Snapshot / Named Version Action */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          {!isCreating ? (
            <button
              id="btn-name-current-version"
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Name Current Version</span>
            </button>
          ) : (
            <div className="space-y-2">
              <input
                id="named-version-input"
                type="text"
                placeholder='e.g. "Draft submitted" or "Final review"'
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNamedVersion();
                }}
                className="w-full text-xs p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                autoFocus
              />
              {/* University assignment preset tags */}
              <div className="flex flex-wrap gap-1">
                {['Draft submitted', 'Group Review', 'Final Submission'].map(
                  (preset) => (
                    <button
                      key={preset}
                      onClick={() => handleSaveNamedVersion(preset)}
                      className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-colors"
                    >
                      {preset}
                    </button>
                  )
                )}
              </div>
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => setIsCreating(false)}
                  className="px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-version"
                  onClick={() => handleSaveNamedVersion()}
                  disabled={!newVersionName.trim()}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Versions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {versions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600">No versions saved yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Autosaves occur every 30s. Click above to create milestone snapshots.
              </p>
            </div>
          ) : (
            versions.map((ver) => {
              const formattedDate = new Date(ver.createdAt).toLocaleString(
                undefined,
                {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              );

              return (
                <div
                  key={ver.id}
                  id={`version-item-${ver.id}`}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-slate-800/70 hover:bg-blue-50/20 dark:hover:bg-slate-800 text-xs transition-colors group shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div className="flex items-center space-x-1.5">
                      <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                        {ver.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formattedDate}
                    </span>
                    <span>by {ver.createdBy}</span>
                  </div>

                  {/* Action buttons: Diff Preview & Restore */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2">
                    <button
                      id={`btn-diff-${ver.id}`}
                      onClick={() => setSelectedVersionForDiff(ver)}
                      className="flex items-center space-x-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <GitCompare className="w-3 h-3" />
                      <span>Preview Diff</span>
                    </button>
                    <button
                      onClick={() => handleRestore(ver)}
                      className="flex items-center space-x-1 text-[11px] text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white font-medium px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Version Diff Modal */}
      {selectedVersionForDiff && selectedVersionForDiff.ydocState && (
        <VersionDiff
          currentYdoc={ydoc}
          versionState={selectedVersionForDiff.ydocState}
          versionName={selectedVersionForDiff.name}
          versionDate={new Date(selectedVersionForDiff.createdAt).toLocaleString()}
          onRestore={() => handleRestore(selectedVersionForDiff)}
          onClose={() => setSelectedVersionForDiff(null)}
        />
      )}
    </>
  );
}
