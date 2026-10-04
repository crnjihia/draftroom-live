import 'dotenv/config';
import * as Y from 'yjs';
import { createHocuspocus } from './hocuspocus';
import { createSocketIO } from './socket';
import { saveDocumentSnapshot } from './persistence';

const PORT = Number(process.env.PORT ?? 1234);

async function bootstrap() {
  // Initialize Hocuspocus server
  const hocuspocus = createHocuspocus();

  // Listen on specified port
  await hocuspocus.listen(PORT);

  // Attach Socket.io to the underlying HTTP server of Hocuspocus
  const io = createSocketIO(hocuspocus.httpServer);

  console.log(`\n======================================================`);
  console.log(`⚡️ DRAFTROOM LIVE COLLAB SERVER`);
  console.log(`📡 WebSocket (Hocuspocus Yjs sync): ws://localhost:${PORT}`);
  console.log(`💬 Socket.io (Presence & Cursors):  http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  // Periodic 30-second autosave check across active documents
  const autosaveInterval = setInterval(async () => {
    try {
      const documents = hocuspocus.hocuspocus.documents;
      for (const [docName, doc] of documents.entries()) {
        if (doc && doc.getConnectionsCount() > 0) {
          const state = Y.encodeStateAsUpdate(doc);
          await saveDocumentSnapshot(docName, state);
        }
      }
    } catch (err) {
      console.error('[CollabServer] Periodic autosave error:', err);
    }
  }, 30000);

  // Graceful shutdown handling
  const shutdown = async () => {
    console.log('\n[CollabServer] Gracefully shutting down...');
    clearInterval(autosaveInterval);

    try {
      // Store all documents before termination
      for (const [docName, doc] of hocuspocus.hocuspocus.documents.entries()) {
        if (doc) {
          const state = Y.encodeStateAsUpdate(doc);
          await saveDocumentSnapshot(docName, state);
        }
      }
    } catch (e) {
      // ignore during shutdown
    }

    io.close(() => {
      console.log('[CollabServer] Socket.io closed');
    });

    await hocuspocus.destroy();
    console.log('[CollabServer] Hocuspocus stopped. Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[CollabServer] Fatal error on start:', err);
  process.exit(1);
});
