import * as Y from 'yjs';

/**
 * Creates a serialized RelativePosition from a character index in a Y.Text or Y.XmlFragment.
 * A RelativePosition is linked to a specific item in the CRDT list.
 * Even when characters are inserted or deleted prior to this position,
 * resolving the RelativePosition will always yield the updated absolute index!
 */
export function createRelativeAnchor(
  type: Y.XmlFragment | Y.Text,
  index: number
): string {
  const relPos = Y.createRelativePositionFromTypeIndex(type as any, index);
  const encoded = Y.encodeRelativePosition(relPos);
  // Store as base64 or JSON for persistence
  return JSON.stringify(Array.from(encoded));
}

/**
 * Resolves a serialized RelativePosition back into the current absolute index in the Y.Doc.
 * Returns null if the anchored item was completely deleted or cannot be resolved.
 */
export function resolveRelativeAnchor(
  ydoc: Y.Doc,
  serializedAnchor: string
): number | null {
  try {
    const rawArray = JSON.parse(serializedAnchor);
    const uint8 = new Uint8Array(rawArray);
    const relPos = Y.decodeRelativePosition(uint8);
    const absPos = Y.createAbsolutePositionFromRelativePosition(relPos, ydoc);
    return absPos ? absPos.index : null;
  } catch (err) {
    console.warn('[Yjs Anchor] Failed to resolve relative anchor:', err);
    return null;
  }
}

/**
 * Creates an anchored range (start and end relative positions) from ProseMirror / TipTap positions.
 */
export function createAnchoredRange(
  type: Y.XmlFragment | Y.Text,
  from: number,
  to: number
): { start: string; end: string } {
  return {
    start: createRelativeAnchor(type, from),
    end: createRelativeAnchor(type, to),
  };
}

/**
 * Resolves an anchored range back into current { from, to } absolute positions.
 */
export function resolveAnchoredRange(
  ydoc: Y.Doc,
  range: { start: string; end: string }
): { from: number; to: number } | null {
  const from = resolveRelativeAnchor(ydoc, range.start);
  const to = resolveRelativeAnchor(ydoc, range.end);
  if (from === null) return null;
  return {
    from,
    to: to !== null ? Math.max(from, to) : from,
  };
}
