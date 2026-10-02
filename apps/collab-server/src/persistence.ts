import { Server as HocuspocusServer } from '@hocuspocus/server';
import { PrismaClient } from '@prisma/client';

/**
 * Persistence hooks for Hocuspocus to store Yjs document snapshots in PostgreSQL.
 * TODO: Implement snapshot saving every 30 s and on disconnect.
 */
export function setupPersistence(hocuspocus: HocuspocusServer) {
  const prisma = new PrismaClient();

  // Example hook: onSync, you could store updates
  hocuspocus.on('documentLoaded', async ({ document }) => {
    const docId = document.name;
    // Load the latest snapshot from DB if exists (placeholder)
    const snapshot = await prisma.documentSnapshot.findFirst({
      where: { documentId: docId },
      orderBy: { createdAt: 'desc' },
    });
    if (snapshot) {
      // TODO: Apply snapshot state to Y.Doc
    }
  });

  // Save snapshot on disconnect (placeholder)
  hocuspocus.on('disconnect', async ({ document }) => {
    const docId = document.name;
    const state = document.encodeStateAsUpdate(); // Uint8Array
    await prisma.documentSnapshot.create({
      data: {
        documentId: docId,
        ydocState: state,
        // createdAt defaults to now
      },
    });
  });

  // TODO: Periodic autosave (e.g., setInterval) every 30 s

  return prisma;
}
