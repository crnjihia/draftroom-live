import { AwarenessState, AwarenessUser } from '@studyroom/shared';

/**
 * Throttler that ensures awareness broadcasts (such as live cursor updates)
 * do not exceed once every 50ms per key (e.g. documentId + clientId).
 */
export class AwarenessThrottler {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private pendingUpdates: Map<string, () => void> = new Map();
  private readonly delayMs: number;

  constructor(delayMs = 50) {
    this.delayMs = delayMs;
  }

  /**
   * Schedule an update with 50ms throttling.
   */
  public throttle(key: string, callback: () => void): void {
    this.pendingUpdates.set(key, callback);

    if (this.timers.has(key)) {
      return;
    }

    const timer = setTimeout(() => {
      this.timers.delete(key);
      const latestCallback = this.pendingUpdates.get(key);
      this.pendingUpdates.delete(key);
      if (latestCallback) {
        latestCallback();
      }
    }, this.delayMs);

    this.timers.set(key, timer);
  }

  public clear(key?: string): void {
    if (key) {
      const timer = this.timers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
      this.pendingUpdates.delete(key);
    } else {
      this.timers.forEach((t) => clearTimeout(t));
      this.timers.clear();
      this.pendingUpdates.clear();
    }
  }
}

/**
 * In-memory presence tracker for active documents.
 */
export class DocumentPresenceStore {
  // docId -> Map<socketId, AwarenessState>
  private presenceByDoc: Map<string, Map<string, AwarenessState>> = new Map();

  public setPresence(docId: string, socketId: string, state: AwarenessState): void {
    if (!this.presenceByDoc.has(docId)) {
      this.presenceByDoc.set(docId, new Map());
    }
    this.presenceByDoc.get(docId)!.set(socketId, {
      ...state,
      lastActive: Date.now(),
    });
  }

  public removePresence(docId: string, socketId: string): AwarenessState | null {
    const docMap = this.presenceByDoc.get(docId);
    if (!docMap) return null;
    const existing = docMap.get(socketId) ?? null;
    docMap.delete(socketId);
    if (docMap.size === 0) {
      this.presenceByDoc.delete(docId);
    }
    return existing;
  }

  public getDocumentUsers(docId: string): AwarenessUser[] {
    const docMap = this.presenceByDoc.get(docId);
    if (!docMap) return [];
    const users: AwarenessUser[] = [];
    const seen = new Set<string>();
    for (const state of docMap.values()) {
      if (state.user && !seen.has(state.user.id)) {
        seen.add(state.user.id);
        users.push(state.user);
      }
    }
    return users;
  }

  public getDocumentStates(docId: string): Record<string, AwarenessState> {
    const docMap = this.presenceByDoc.get(docId);
    if (!docMap) return {};
    const result: Record<string, AwarenessState> = {};
    docMap.forEach((state, socketId) => {
      result[socketId] = state;
    });
    return result;
  }
}

export const awarenessThrottler = new AwarenessThrottler(50);
export const presenceStore = new DocumentPresenceStore();
