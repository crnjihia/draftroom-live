'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { useYjs } from '@/hooks/useYjs';
import PresenceBar from './PresenceBar';
import CursorOverlay from './CursorOverlay';
import CommentSidebar from './CommentSidebar';
import VersionHistory from './VersionHistory';
import { AwarenessUser } from '@andika/shared';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  MessageSquarePlus,
  Undo,
  Redo,
} from 'lucide-react';

interface EditorProps {
  documentId: string;
  documentTitle?: string;
  currentUser?: Partial<AwarenessUser>;
}

export default function Editor({
  documentId,
  documentTitle = 'Untitled Assignment',
  currentUser,
}: EditorProps) {
  const { ydoc, provider, socket, status, isSynced, user } = useYjs({
    documentId,
    user: currentUser,
  });

  const [showComments, setShowComments] = useState(true);
  const [showVersions, setShowVersions] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [pendingCommentRange, setPendingCommentRange] = useState<{
    from: number;
    to: number;
    text: string;
  } | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize TipTap editor with Yjs Collaboration extension
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // History is disabled when using Yjs Collaboration because Yjs manages undo/redo
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
        field: 'prosemirror',
      }),
      ...(provider
        ? [
            CollaborationCursor.configure({
              provider,
              user: {
                name: user.name,
                color: user.color,
              },
            }),
          ]
        : []),
    ],
    editorProps: {
      attributes: {
        class:
          'focus:outline-none min-h-[550px] p-8 text-slate-800 leading-relaxed max-w-none text-base',
      },
    },
    onUpdate: () => {
      // Trigger typing indicator via Socket.io
      if (socket) {
        socket.emit('typing', { docId: documentId, isTyping: true });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing', { docId: documentId, isTyping: false });
        }, 1200);
      }
    },
    onSelectionUpdate: ({ editor: activeEditor }) => {
      // Broadcast cursor coordinates to peers via socket
      if (socket) {
        const { from, to } = activeEditor.state.selection;
        socket.emit('cursorMove', {
          docId: documentId,
          cursor: { index: from, length: to - from },
        });
      }
    },
  }, [ydoc, provider]);

  // Handle comment button click from selected text
  const handleAddCommentFromSelection = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;

    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    setPendingCommentRange({
      from,
      to,
      text: selectedText || 'Selected text',
    });
    setShowComments(true);
    setShowVersions(false);
  };

  const hasSelection = editor && !editor.state.selection.empty;

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Top Header & Presence Bar */}
      <PresenceBar
        documentId={documentId}
        provider={provider}
        socket={socket}
        status={status}
        isSynced={isSynced}
        currentUser={user}
        onToggleComments={() => {
          setShowComments((v) => !v);
          if (!showComments) setShowVersions(false);
        }}
        onToggleVersions={() => {
          setShowVersions((v) => !v);
          if (!showVersions) setShowComments(false);
        }}
        showComments={showComments}
        showVersions={showVersions}
        commentCount={commentCount}
      />

      {/* Editor Main Section */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Editor Body */}
        <div className="flex-1 flex flex-col overflow-y-auto items-center p-4 sm:p-8">
          {/* Document Container Card */}
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col relative editor-container my-auto">
            {/* Document Title Header */}
            <div className="px-8 pt-6 pb-2 border-b border-slate-100 flex items-center justify-between">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                {documentTitle}
              </h1>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                Room: {documentId.slice(0, 8)}
              </span>
            </div>

            {/* TipTap Formatting Toolbar */}
            {editor && (
              <div className="flex flex-wrap items-center gap-1 px-8 py-2 bg-slate-50 border-b border-slate-200 text-slate-600">
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                    editor.isActive('bold') ? 'bg-slate-200 text-blue-700 font-bold' : ''
                  }`}
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                    editor.isActive('italic') ? 'bg-slate-200 text-blue-700' : ''
                  }`}
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-4 h-4" />
                </button>

                <div className="w-px h-4 bg-slate-300 mx-1" />

                <button
                  type="button"
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 1 }).run()
                  }
                  className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                    editor.isActive('heading', { level: 1 })
                      ? 'bg-slate-200 text-blue-700'
                      : ''
                  }`}
                  title="Heading 1"
                >
                  <Heading1 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level: 2 }).run()
                  }
                  className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                    editor.isActive('heading', { level: 2 })
                      ? 'bg-slate-200 text-blue-700'
                      : ''
                  }`}
                  title="Heading 2"
                >
                  <Heading2 className="w-4 h-4" />
                </button>

                <div className="w-px h-4 bg-slate-300 mx-1" />

                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                    editor.isActive('bulletList')
                      ? 'bg-slate-200 text-blue-700'
                      : ''
                  }`}
                  title="Bullet List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                    editor.isActive('orderedList')
                      ? 'bg-slate-200 text-blue-700'
                      : ''
                  }`}
                  title="Numbered List"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBlockquote().run()}
                  className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                    editor.isActive('blockquote')
                      ? 'bg-slate-200 text-blue-700'
                      : ''
                  }`}
                  title="Quote"
                >
                  <Quote className="w-4 h-4" />
                </button>

                {/* Add Comment Button */}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    id="btn-add-comment"
                    onClick={handleAddCommentFromSelection}
                    disabled={!hasSelection}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                      hasSelection
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-2xs'
                        : 'opacity-40 cursor-not-allowed text-slate-400'
                    }`}
                    title="Add Comment to selected text"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5 text-amber-700" />
                    <span>Comment</span>
                  </button>
                </div>
              </div>
            )}

            {/* ProseMirror Content Area with Remote Cursors Overlay */}
            <div className="relative min-h-[550px]">
              <EditorContent editor={editor} />
              <CursorOverlay
                editor={editor}
                provider={provider}
                socket={socket}
                currentUser={user}
              />
            </div>
          </div>
        </div>

        {/* Comment Thread Sidebar */}
        {showComments && (
          <CommentSidebar
            documentId={documentId}
            ydoc={ydoc}
            currentUser={user}
            socket={socket}
            editor={editor}
            onClose={() => setShowComments(false)}
            pendingCommentRange={pendingCommentRange}
            onClearPendingRange={() => setPendingCommentRange(null)}
          />
        )}

        {/* Version History Sidebar */}
        {showVersions && (
          <VersionHistory
            documentId={documentId}
            ydoc={ydoc}
            currentUser={user}
            socket={socket}
            onClose={() => setShowVersions(false)}
          />
        )}
      </div>
    </div>
  );
}
