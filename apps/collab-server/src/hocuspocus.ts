import { Server as HocuspocusServer } from '@hocuspocus/server';
import { Redis as RedisExtension } from '@hocuspocus/extension-redis';
import * as Y from 'yjs';
import { loadDocumentSnapshot, saveDocumentSnapshot } from './persistence';

const MAX_EDITORS_PER_DOC = 20;

/**
 * Creates and configures the Hocuspocus server for Yjs CRDT synchronization.
 * Includes:
 * - PostgreSQL persistence hooks (loading initial snapshot, auto-saving every 30s + on disconnect)
 * - SHA-256 content-hash deduplication
 * - Max 20 concurrent editors connection limit
 * - Redis extension for horizontal multi-instance scaling
 */
export function createHocuspocus(): HocuspocusServer {
  const extensions: any[] = [];

  // Enable Redis extension if REDIS_HOST or REDIS_URL is provided
  if (process.env.REDIS_HOST || process.env.REDIS_URL) {
    try {
      const redisExt = new RedisExtension({
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      });
      extensions.push(redisExt);
      console.log('[Hocuspocus] Redis extension enabled for multi-instance scaling');
    } catch (e) {
      console.warn('[Hocuspocus] Redis extension initialization skipped:', e);
    }
  }

  const server = new HocuspocusServer({
    name: 'andika-hocuspocus',
    port: Number(process.env.PORT ?? 1234),
    debounce: 30000,
    maxDebounce: 30000,
    unloadImmediately: false,
    extensions,

    // Enforce max 20 editors rate limit
    async onConnect(data) {
      const existingDoc = data.instance.documents.get(data.documentName);
      const connectionCount = existingDoc ? existingDoc.getConnectionsCount() : 0;
      if (connectionCount >= MAX_EDITORS_PER_DOC) {
        throw new Error(
          `Connection limit reached: Maximum ${MAX_EDITORS_PER_DOC} concurrent editors allowed per document.`
        );
      }
      console.log(`[Hocuspocus] Client connected to doc ${data.documentName} (${connectionCount + 1}/${MAX_EDITORS_PER_DOC})`);
    },

    // Hydrate Y.Doc from PostgreSQL snapshot on initial document load
    async onLoadDocument(data) {
      const { documentName, document } = data;
      const snapshotState = await loadDocumentSnapshot(documentName);

      if (snapshotState) {
        Y.applyUpdate(document, snapshotState);
        console.log(`[Hocuspocus] Hydrated Y.Doc for "${documentName}" from PostgreSQL snapshot`);
      } else {
        // Initialize an empty rich-text fragment if new document
        const fragment = document.getXmlFragment('prosemirror');
        if (fragment.length === 0) {
          console.log(`[Hocuspocus] Initialized fresh Y.Doc prosemirror fragment for "${documentName}"`);
        }
      }

      return document;
    },

    // Autosave snapshot every 30s with SHA-256 content-hash deduplication
    async onStoreDocument(data) {
      const { documentName, document } = data;
      const state = Y.encodeStateAsUpdate(document);
      await saveDocumentSnapshot(documentName, state);
    },

    // Save final state on disconnect
    async onDisconnect(data) {
      const { documentName, document } = data;
      console.log(`[Hocuspocus] Client disconnected from doc "${documentName}"`);
      const state = Y.encodeStateAsUpdate(document);
      await saveDocumentSnapshot(documentName, state);
    },
  });

  return server;
}
