import React, { useEffect, useRef } from 'react';
import { useYjs } from '@/hooks/useYjs';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

/**
 * Editor component bound to a Yjs document via the useYjs hook.
 * TODO: Implement proper Yjs binding with Y.XmlFragment and awareness.
 */
export default function Editor() {
  const { ydoc, provider } = useYjs();
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Hello Andika Live!</p>',
    onUpdate: ({ editor }) => {
      // TODO: sync updates to Yjs
    },
  });

  useEffect(() => {
    if (editor && ydoc && provider) {
      // TODO: bind Yjs XML fragment to TipTap editor
    }
  }, [editor, ydoc, provider]);

  return (
    <div className="border rounded p-2 bg-white shadow">
      <EditorContent editor={editor} />
    </div>
  );
}
