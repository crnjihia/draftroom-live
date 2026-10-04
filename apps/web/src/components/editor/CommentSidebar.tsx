'use client';

import React, { useState, useEffect } from 'react';
import * as Y from 'yjs';
import { Socket } from 'socket.io-client';
import { Editor } from '@tiptap/react';
import { AwarenessUser, CommentThreadData } from '@andika/shared';
import {
  createAnchoredRange,
  resolveAnchoredRange,
} from '@/lib/yjs/relativePosition';
import {
  X,
  MessageSquare,
  CheckCircle,
  CornerDownRight,
  Send,
  Trash2,
  Check,
  RotateCcw,
} from 'lucide-react';

interface CommentSidebarProps {
  documentId: string;
  ydoc: Y.Doc;
  currentUser: AwarenessUser;
  socket: Socket | null;
  editor: Editor | null;
  onClose: () => void;
  pendingCommentRange: { from: number; to: number; text: string } | null;
  onClearPendingRange: () => void;
}

export default function CommentSidebar({
  documentId,
  ydoc,
  currentUser,
  socket,
  editor,
  onClose,
  pendingCommentRange,
  onClearPendingRange,
}: CommentSidebarProps) {
  const [threads, setThreads] = useState<CommentThreadData[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active');
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Fetch threads on mount
  useEffect(() => {
    async function loadThreads() {
      try {
        const res = await fetch(`/api/comments?documentId=${documentId}`);
        if (res.ok) {
          const data = await res.json();
          setThreads(data);
        }
      } catch (err) {
        console.warn('[Comments] Failed to load threads from API:', err);
      }
    }
    loadThreads();
  }, [documentId]);

  // Listen to real-time socket events for comments
  useEffect(() => {
    if (!socket) return;

    const handleThreadCreated = (thread: CommentThreadData) => {
      setThreads((prev) => {
        if (prev.some((t) => t.id === thread.id)) return prev;
        return [thread, ...prev];
      });
    };

    const handleCommentAdded = (data: { threadId: string; comment: any }) => {
      setThreads((prev) =>
        prev.map((th) =>
          th.id === data.threadId
            ? { ...th, comments: [...th.comments, data.comment] }
            : th
        )
      );
    };

    const handleThreadResolved = (data: { threadId: string; resolved: boolean }) => {
      setThreads((prev) =>
        prev.map((th) =>
          th.id === data.threadId ? { ...th, resolved: data.resolved } : th
        )
      );
    };

    socket.on('commentThreadCreated', handleThreadCreated);
    socket.on('commentAdded', handleCommentAdded);
    socket.on('commentThreadResolved', handleThreadResolved);

    return () => {
      socket.off('commentThreadCreated', handleThreadCreated);
      socket.off('commentAdded', handleCommentAdded);
      socket.off('commentThreadResolved', handleThreadResolved);
    };
  }, [socket]);

  // Create a new comment thread anchored to selected text via Yjs RelativePosition
  const handleCreateThread = async () => {
    if (!newCommentText.trim() || !pendingCommentRange) return;

    const fragment = ydoc.getXmlFragment('prosemirror');
    const anchoredRange = createAnchoredRange(
      fragment,
      pendingCommentRange.from,
      pendingCommentRange.to
    );
    const anchorYjsId = JSON.stringify(anchoredRange);

    const threadPayload: CommentThreadData = {
      id: `thread-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      documentId,
      anchorYjsId,
      resolved: false,
      createdAt: new Date().toISOString(),
      comments: [
        {
          id: `cmt-${Date.now()}`,
          threadId: '',
          userId: currentUser.id,
          content: newCommentText.trim(),
          createdAt: new Date().toISOString(),
          user: currentUser as any,
        },
      ],
    };
    threadPayload.comments[0].threadId = threadPayload.id;

    // Optimistic UI update
    setThreads((prev) => [threadPayload, ...prev]);
    setNewCommentText('');
    onClearPendingRange();

    // Broadcast via socket
    socket?.emit('newCommentThread', { docId: documentId, thread: threadPayload });

    // Persist to DB
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(threadPayload),
      });
    } catch (err) {
      console.warn('[Comments] Error persisting thread:', err);
    }
  };

  // Reply to an existing thread
  const handleAddReply = async (threadId: string) => {
    const text = replyTexts[threadId]?.trim();
    if (!text) return;

    const newComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      threadId,
      userId: currentUser.id,
      content: text,
      createdAt: new Date().toISOString(),
      user: currentUser as any,
    };

    // Optimistic update
    setThreads((prev) =>
      prev.map((th) =>
        th.id === threadId ? { ...th, comments: [...th.comments, newComment] } : th
      )
    );
    setReplyTexts((prev) => ({ ...prev, [threadId]: '' }));

    socket?.emit('commentAdded', { docId: documentId, threadId, comment: newComment });

    try {
      await fetch(`/api/comments/${documentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComment),
      });
    } catch (e) {
      console.warn('[Comments] Error persisting reply:', e);
    }
  };

  // Resolve / Unresolve thread
  const handleToggleResolve = async (threadId: string, currentResolved: boolean) => {
    const updated = !currentResolved;
    setThreads((prev) =>
      prev.map((th) => (th.id === threadId ? { ...th, resolved: updated } : th))
    );

    socket?.emit('resolveCommentThread', {
      docId: documentId,
      threadId,
      resolved: updated,
    });

    try {
      await fetch(`/api/comments/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId, resolved: updated }),
      });
    } catch (e) {
      console.warn('[Comments] Error updating resolve status:', e);
    }
  };

  // Jump editor selection to comment anchor (resolving RelativePosition)
  const handleJumpToAnchor = (anchorYjsId: string, threadId: string) => {
    setActiveThreadId(threadId);
    if (!editor || !ydoc) return;

    try {
      const anchoredRange = JSON.parse(anchorYjsId);
      const absRange = resolveAnchoredRange(ydoc, anchoredRange);
      if (absRange && typeof absRange.from === 'number') {
        const docSize = editor.state.doc.content.size;
        const from = Math.min(absRange.from, docSize);
        const to = Math.min(absRange.to, docSize);

        editor.chain().focus().setTextSelection({ from, to }).run();
      }
    } catch (e) {
      console.warn('[Comments] Failed to jump to anchor:', e);
    }
  };

  const filteredThreads = threads.filter((th) => {
    if (filter === 'active') return !th.resolved;
    if (filter === 'resolved') return th.resolved;
    return true;
  });

  return (
    <aside
      id="comment-sidebar"
      className="w-80 h-full bg-white border-l border-slate-200 flex flex-col z-30 shadow-lg"
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-sm text-slate-800">
            Comments & Feedback
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-100 px-4 py-2 bg-white text-xs gap-1">
        {(['active', 'all', 'resolved'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-2.5 py-1 rounded-full font-medium capitalize transition-colors ${
              filter === tab
                ? 'bg-amber-100 text-amber-800'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Pending New Comment Form (triggered from text selection) */}
      {pendingCommentRange && (
        <div
          id="new-comment-box"
          className="p-3 m-3 bg-amber-50/80 border border-amber-200 rounded-lg shadow-sm"
        >
          <div className="text-[11px] font-semibold text-amber-800 mb-1 flex items-center justify-between">
            <span>Anchored to selection:</span>
            <button
              onClick={onClearPendingRange}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs italic text-slate-600 mb-2 border-l-2 border-amber-400 pl-2 line-clamp-2">
            &ldquo;{pendingCommentRange.text}&rdquo;
          </p>
          <textarea
            id="new-comment-input"
            rows={2}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Add assignment feedback or note..."
            className="w-full text-xs p-2 border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={onClearPendingRange}
              className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              id="btn-post-comment"
              onClick={handleCreateThread}
              disabled={!newCommentText.trim()}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium rounded flex items-center gap-1 shadow-sm"
            >
              <Send className="w-3 h-3" />
              <span>Comment</span>
            </button>
          </div>
        </div>
      )}

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredThreads.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">No {filter} comments</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Highlight any text in the assignment to anchor a comment thread.
            </p>
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const isResolved = thread.resolved;
            const firstComment = thread.comments[0];
            const replies = thread.comments.slice(1);
            const isActive = activeThreadId === thread.id;

            return (
              <div
                key={thread.id}
                id={`comment-thread-${thread.id}`}
                onClick={() => handleJumpToAnchor(thread.anchorYjsId, thread.id)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                  isActive
                    ? 'border-amber-400 bg-amber-50/40 shadow-sm'
                    : isResolved
                    ? 'border-slate-200 bg-slate-50 opacity-75'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Header: User & Actions */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{
                        backgroundColor:
                          firstComment?.user?.avatarColor ||
                          currentUser.color ||
                          '#8b5cf6',
                      }}
                    />
                    <span className="font-semibold text-slate-800">
                      {firstComment?.user?.name || 'Collaborator'}
                    </span>
                    {firstComment?.user?.university && (
                      <span className="text-[9px] text-slate-400">
                        • {firstComment.user.university}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleResolve(thread.id, isResolved);
                    }}
                    className={`p-1 rounded hover:bg-slate-100 ${
                      isResolved ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                    title={isResolved ? 'Reopen thread' : 'Resolve thread'}
                  >
                    {isResolved ? (
                      <RotateCcw className="w-3.5 h-3.5" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Comment Content */}
                <p className="text-slate-700 leading-relaxed mb-2">
                  {firstComment?.content}
                </p>

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-slate-100 pl-2">
                    {replies.map((reply) => (
                      <div key={reply.id} className="text-[11px]">
                        <div className="flex items-center space-x-1 font-semibold text-slate-700">
                          <CornerDownRight className="w-2.5 h-2.5 text-slate-400" />
                          <span>{reply.user?.name || 'Collaborator'}</span>
                        </div>
                        <p className="text-slate-600 pl-4">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Reply Box */}
                {!isResolved && (
                  <div
                    className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      placeholder="Reply..."
                      value={replyTexts[thread.id] || ''}
                      onChange={(e) =>
                        setReplyTexts((prev) => ({
                          ...prev,
                          [thread.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddReply(thread.id);
                      }}
                      className="flex-1 text-[11px] p-1 px-2 border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleAddReply(thread.id)}
                      className="p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
                    >
                      Reply
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
