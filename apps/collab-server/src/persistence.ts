import crypto from 'crypto';
import * as Y from 'yjs';
import { prisma } from '@andika/shared';

/**
 * Computes SHA-256 hash of a Yjs state update.
 */
export function computeStateHash(state: Uint8Array): string {
  return crypto.createHash('sha256').update(state).digest('hex');
}

/**
 * Checks if two Yjs state updates are identical by content hash.
 */
export function isDuplicateSnapshot(stateA: Uint8Array, stateB: Uint8Array): boolean {
  return computeStateHash(stateA) === computeStateHash(stateB);
}

/**
 * Loads the latest snapshot for a document from PostgreSQL.
 */
export async function loadDocumentSnapshot(documentId: string): Promise<Uint8Array | null> {
  try {
    const snapshot = await prisma.documentSnapshot.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    if (!snapshot || !snapshot.ydocState) {
      return null;
    }

    return new Uint8Array(snapshot.ydocState);
  } catch (error) {
    console.warn(`[Persistence] Could not load snapshot for ${documentId}:`, error);
    return null;
  }
}

/**
 * Saves a Y.Doc snapshot every 30s or on disconnect.
 * Deduplicates using SHA-256 content hash: if state hasn't changed, skips DB write.
 */
export async function saveDocumentSnapshot(
  documentId: string,
  state: Uint8Array
): Promise<{ saved: boolean; hash: string }> {
  const currentHash = computeStateHash(state);

  try {
    const latestSnapshot = await prisma.documentSnapshot.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    if (latestSnapshot && latestSnapshot.ydocState) {
      const lastHash = computeStateHash(new Uint8Array(latestSnapshot.ydocState));
      if (lastHash === currentHash) {
        // Content hash matches: skip redundant duplicate snapshot
        return { saved: false, hash: currentHash };
      }
    }

    // Ensure document exists in DB before attaching snapshot
    const docExists = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!docExists) {
      // Create stub document if created dynamically via room ID
      await prisma.document.create({
        data: {
          id: documentId,
          title: `Assignment-${documentId.slice(0, 6)}`,
          ownerId: 'default-owner',
        },
      }).catch(() => {
        // ignore if concurrent creation
      });
    }

    await prisma.documentSnapshot.create({
      data: {
        documentId,
        ydocState: Buffer.from(state),
      },
    });

    console.log(`[Persistence] Autosaved snapshot for doc: ${documentId} (hash: ${currentHash.slice(0, 8)})`);
    return { saved: true, hash: currentHash };
  } catch (error) {
    console.error(`[Persistence] Error saving snapshot for ${documentId}:`, error);
    return { saved: false, hash: currentHash };
  }
}
