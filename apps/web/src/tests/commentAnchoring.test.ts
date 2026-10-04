import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import {
  createAnchoredRange,
  resolveAnchoredRange,
  createRelativeAnchor,
  resolveRelativeAnchor,
} from '../lib/yjs/relativePosition';

describe('Yjs CRDT Comment Anchoring (RelativePosition)', () => {
  it('should anchor to a text position and resolve the initial absolute index', () => {
    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('assignment');
    ytext.insert(0, 'University of Nairobi Assignment');

    // Anchor at "Nairobi" (index 14 to 21)
    const anchor = createAnchoredRange(ytext as any, 14, 21);
    expect(anchor.start).toBeDefined();
    expect(anchor.end).toBeDefined();

    const resolved = resolveAnchoredRange(ydoc, anchor);
    expect(resolved).not.toBeNull();
    expect(resolved?.from).toBe(14);
    expect(resolved?.to).toBe(21);
  });

  it('should survive concurrent text insertion BEFORE the anchor and automatically shift index', () => {
    // Client A
    const docA = new Y.Doc();
    const textA = docA.getText('content');
    textA.insert(0, 'University of Nairobi Group Project');

    // Client B synced with Client A
    const docB = new Y.Doc();
    const textB = docB.getText('content');
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

    // Client A creates an anchored comment on "Nairobi" (start: 14, length: 7)
    const anchorStart = createRelativeAnchor(textA, 14);
    const anchorEnd = createRelativeAnchor(textA, 21);

    // Client B concurrently inserts "The " (4 chars) at the very beginning (index 0)
    textB.insert(0, 'The ');

    // Sync B's edit to Client A
    const updateFromB = Y.encodeStateAsUpdate(docB);
    Y.applyUpdate(docA, updateFromB);

    // Text in Doc A is now "The University of Nairobi Group Project"
    expect(textA.toString()).toBe('The University of Nairobi Group Project');

    // Resolve original anchor in Doc A: it MUST automatically shift from 14 to 18!
    const resolvedStart = resolveRelativeAnchor(docA, anchorStart);
    const resolvedEnd = resolveRelativeAnchor(docA, anchorEnd);

    expect(resolvedStart).toBe(18);
    expect(resolvedEnd).toBe(25);

    // Verify the text at the resolved range is still precisely "Nairobi"
    const anchoredWord = textA.toString().slice(resolvedStart!, resolvedEnd!);
    expect(anchoredWord).toBe('Nairobi');
  });

  it('should survive text deletion BEFORE the anchor and adjust index backwards', () => {
    const doc = new Y.Doc();
    const text = doc.getText('content');
    text.insert(0, 'USIU-Africa APT3040 Distributed Systems');

    // Anchor on "Distributed Systems" (index 20 to 39)
    const anchor = createAnchoredRange(text as any, 20, 39);

    // Delete "USIU-Africa " (12 characters) from the beginning
    text.delete(0, 12);
    expect(text.toString()).toBe('APT3040 Distributed Systems');

    // Resolved index must have shifted backwards by 12 (from 20 to 8, and 39 to 27)
    const resolved = resolveAnchoredRange(doc, anchor);
    expect(resolved?.from).toBe(8);
    expect(resolved?.to).toBe(27);

    const targetSlice = text.toString().slice(resolved!.from, resolved!.to);
    expect(targetSlice).toBe('Distributed Systems');
  });

  it('should handle concurrent bidirectional edits between two collaborators', () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    const text1 = doc1.getText('assignment');
    const text2 = doc2.getText('assignment');

    text1.insert(0, 'Chapter 1: CRDT Merging Architecture');
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));

    // Doc1 anchors "CRDT Merging" (index 11 to 23)
    const anchor = createAnchoredRange(text1 as any, 11, 23);

    // Concurrently:
    // Collaborator 1 appends text at the end
    text1.insert(text1.length, ' - Final Draft');

    // Collaborator 2 prepends text at the beginning
    text2.insert(0, '[DRAFT] ');

    // Cross-sync both documents
    Y.applyUpdate(doc1, Y.encodeStateAsUpdate(doc2));
    Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));

    // Both documents must converge to identical string content
    expect(doc1.getText('assignment').toString()).toBe(
      doc2.getText('assignment').toString()
    );

    // Resolve anchor in both documents
    const res1 = resolveAnchoredRange(doc1, anchor);
    const res2 = resolveAnchoredRange(doc2, anchor);

    expect(res1).toEqual(res2);
    expect(res1?.from).toBe(19); // 11 + 8 ("[DRAFT] ")
    const word = doc1.getText('assignment').toString().slice(res1!.from, res1!.to);
    expect(word).toBe('CRDT Merging');
  });
});
