import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

/**
 * Initializes client-side IndexedDB persistence for offline-safe editing.
 * All document edits are stored in the browser's local IndexedDB.
 * When internet goes down, changes queue locally.
 * When reconnecting, Yjs syncs only the missing differential updates!
 */
export function setupIndexedDBPersistence(
  docId: string,
  ydoc: Y.Doc,
  onSynced?: () => void
): IndexeddbPersistence | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const persistence = new IndexeddbPersistence(`studyroom-doc-${docId}`, ydoc);

    persistence.once('synced', () => {
      console.log(`[Offline Storage] Yjs IndexedDB hydrated for doc: ${docId}`);
      onSynced?.();
    });

    return persistence;
  } catch (error) {
    console.warn('[Offline Storage] Failed to initialize IndexedDB persistence:', error);
    return null;
  }
}
