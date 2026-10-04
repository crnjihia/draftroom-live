import * as Y from 'yjs';

export interface DiffSegment {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

/**
 * Extracts raw text from a Y.Doc prosemirror XML fragment or text type.
 */
export function extractTextFromYDoc(ydoc: Y.Doc): string {
  const fragment = ydoc.getXmlFragment('prosemirror');
  let result = '';

  const traverse = (node: any) => {
    if (!node) return;
    if (node instanceof Y.XmlText) {
      result += node.toString();
    } else if (node instanceof Y.XmlElement) {
      for (let i = 0; i < node.length; i++) {
        traverse(node.get(i));
      }
      result += '\n';
    } else if (node.forEach) {
      node.forEach((child: any) => traverse(child));
    }
  };

  for (let i = 0; i < fragment.length; i++) {
    traverse(fragment.get(i));
  }

  // Fallback to text map or default if fragment is empty
  if (!result.trim()) {
    const text = ydoc.getText('content');
    if (text && text.length > 0) return text.toString();
  }

  return result || '';
}

/**
 * Reconstructs a Y.Doc from an encoded state update (Uint8Array or base64 string).
 */
export function createYDocFromState(state: Uint8Array | string): Y.Doc {
  const doc = new Y.Doc();
  const binary = typeof state === 'string' ? Buffer.from(state, 'base64') : state;
  Y.applyUpdate(doc, binary);
  return doc;
}

/**
 * Simple word-level Longest Common Subsequence (LCS) diff algorithm.
 */
export function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  const n = oldWords.length;
  const m = newWords.length;
  const matrix: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (oldWords[i] === newWords[j]) {
        matrix[i + 1][j + 1] = matrix[i][j] + 1;
      } else {
        matrix[i + 1][j + 1] = Math.max(matrix[i + 1][j], matrix[i][j + 1]);
      }
    }
  }

  const segments: DiffSegment[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      segments.unshift({ type: 'unchanged', value: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      segments.unshift({ type: 'added', value: newWords[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || matrix[i][j - 1] < matrix[i - 1][j])) {
      segments.unshift({ type: 'removed', value: oldWords[i - 1] });
      i--;
    }
  }

  return segments;
}

/**
 * Generates HTML containing visual diff markings:
 * Added words are wrapped in <ins class="bg-emerald-100 text-emerald-800 underline">
 * Removed words are wrapped in <del class="bg-rose-100 text-rose-800 line-through">
 */
export function generateDiffHtml(oldText: string, newText: string): string {
  const diffs = computeWordDiff(oldText, newText);
  let html = '<div class="prose max-w-none text-slate-800 dark:text-slate-200 leading-relaxed">';

  for (const seg of diffs) {
    const escaped = seg.value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    if (seg.type === 'added') {
      html += `<ins class="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 no-underline font-medium px-1 rounded mx-0.5 border-b-2 border-emerald-500">${escaped}</ins>`;
    } else if (seg.type === 'removed') {
      html += `<del class="bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 line-through px-1 rounded mx-0.5 opacity-80">${escaped}</del>`;
    } else {
      html += escaped;
    }
  }

  html += '</div>';
  return html;
}
