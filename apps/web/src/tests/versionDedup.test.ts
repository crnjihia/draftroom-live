import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import crypto from 'crypto';
import {
  computeStateHash,
  isDuplicateSnapshot,
} from '../../../collab-server/src/persistence';
import {
  extractTextFromYDoc,
  createYDocFromState,
  computeWordDiff,
} from '../lib/yjs/diff';

describe('Version History & Content-Hash Deduplication', () => {
  it('should generate identical SHA-256 hash for identical Y.Doc states', () => {
    const docA = new Y.Doc();
    const textA = docA.getText('content');
    textA.insert(0, 'University of Nairobi CSC411 Assignment');

    const stateA1 = Y.encodeStateAsUpdate(docA);
    const stateA2 = Y.encodeStateAsUpdate(docA);

    const hash1 = computeStateHash(stateA1);
    const hash2 = computeStateHash(stateA2);

    expect(hash1).toBe(hash2);
    expect(isDuplicateSnapshot(stateA1, stateA2)).toBe(true);
  });

  it('should detect state change and produce distinct hash when content is modified', () => {
    const doc = new Y.Doc();
    const text = doc.getText('content');
    text.insert(0, 'Initial Draft');

    const state1 = Y.encodeStateAsUpdate(doc);
    const hash1 = computeStateHash(state1);

    // Modify document
    text.insert(text.length, ' - Reviewed by Faith Wanjiku (Strathmore)');
    const state2 = Y.encodeStateAsUpdate(doc);
    const hash2 = computeStateHash(state2);

    expect(hash1).not.toBe(hash2);
    expect(isDuplicateSnapshot(state1, state2)).toBe(false);
  });

  it('should deduplicate autosave snapshots when no edits have occurred in 30s window', () => {
    const doc = new Y.Doc();
    const text = doc.getText('content');
    text.insert(0, 'Assignment content ready for grading.');

    // Simulated snapshot history
    const snapshots: Array<{ hash: string; state: Uint8Array }> = [];

    const tryTakeSnapshot = (currentDoc: Y.Doc) => {
      const state = Y.encodeStateAsUpdate(currentDoc);
      const hash = computeStateHash(state);

      const lastSnapshot = snapshots[snapshots.length - 1];
      if (lastSnapshot && lastSnapshot.hash === hash) {
        // Duplicate skipped
        return false;
      }

      snapshots.push({ hash, state });
      return true;
    };

    // First snapshot: taken
    expect(tryTakeSnapshot(doc)).toBe(true);
    expect(snapshots.length).toBe(1);

    // Next 3 autosave intervals with no user typing: all deduplicated (0 new snapshots created)
    expect(tryTakeSnapshot(doc)).toBe(false);
    expect(tryTakeSnapshot(doc)).toBe(false);
    expect(tryTakeSnapshot(doc)).toBe(false);
    expect(snapshots.length).toBe(1);

    // User types new paragraph
    text.insert(text.length, '\nConclusion and References.');
    expect(tryTakeSnapshot(doc)).toBe(true);
    expect(snapshots.length).toBe(2);
  });

  it('should restore a historical snapshot and verify exact document content restoration', () => {
    const doc = new Y.Doc();
    const text = doc.getText('content');
    text.insert(0, 'First Milestone: Abstract & Methodology');

    // Save snapshot 1
    const milestone1State = Y.encodeStateAsUpdate(doc);
    const textAtMilestone1 = text.toString();

    // User continues writing milestone 2
    text.insert(text.length, '\nSecond Milestone: Experimental Results and Analysis');
    expect(text.toString()).not.toBe(textAtMilestone1);

    // Reconstruct document from milestone 1 snapshot
    const restoredDoc = createYDocFromState(milestone1State);
    const restoredText = restoredDoc.getText('content').toString();

    expect(restoredText).toBe(textAtMilestone1);
    expect(restoredText).toBe('First Milestone: Abstract & Methodology');
  });

  it('should compute word-level diffs correctly between historical version and current version', () => {
    const oldText = 'Draft submitted by Amina Odhiambo';
    const newText = 'Final review submitted by Amina Odhiambo for grading';

    const diff = computeWordDiff(oldText, newText);
    expect(diff.length).toBeGreaterThan(0);

    const addedWords = diff
      .filter((s) => s.type === 'added')
      .map((s) => s.value.trim())
      .filter(Boolean);
    const removedWords = diff
      .filter((s) => s.type === 'removed')
      .map((s) => s.value.trim())
      .filter(Boolean);

    expect(removedWords).toContain('Draft');
    expect(addedWords).toContain('Final');
    expect(addedWords).toContain('review');
    expect(addedWords).toContain('for');
    expect(addedWords).toContain('grading');
  });
});
