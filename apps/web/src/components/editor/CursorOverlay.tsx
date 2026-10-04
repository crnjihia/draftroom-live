'use client';

import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { AwarenessUser } from '@andika/shared';
import { Editor } from '@tiptap/react';

interface RemoteCursor {
  userId: string;
  user: AwarenessUser;
  index: number;
  coords?: { top: number; left: number };
}

interface CursorOverlayProps {
  editor: Editor | null;
  provider: HocuspocusProvider | null;
  socket: Socket | null;
  currentUser: AwarenessUser;
}

/**
 * Renders other users' live cursors with names, avatar colors, and Kenyan university affiliations.
 * Computes exact pixel coordinates from TipTap's ProseMirror coordinates.
 */
export default function CursorOverlay({
  editor,
  provider,
  socket,
  currentUser,
}: CursorOverlayProps) {
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(
    new Map()
  );

  // Sync cursor positions from Hocuspocus awareness
  useEffect(() => {
    if (!editor || !provider || !provider.awareness) return;

    const awareness = provider.awareness;

    const updateFromAwareness = () => {
      const states = awareness.getStates();
      const updated = new Map<string, RemoteCursor>();

      states.forEach((state, clientId) => {
        if (clientId === awareness.clientID) return; // skip own cursor
        if (!state?.user || !state?.cursor) return;
        if (state.user.id === currentUser.id) return;

        const charIndex = state.cursor.index;
        let coords: { top: number; left: number } | undefined;

        try {
          if (editor.view && typeof charIndex === 'number') {
            const docSize = editor.state.doc.content.size;
            const safePos = Math.min(Math.max(charIndex, 0), docSize);
            const domCoords = editor.view.coordsAtPos(safePos);
            const editorEl = editor.view.dom.closest('.editor-container');
            if (editorEl) {
              const editorRect = editorEl.getBoundingClientRect();
              coords = {
                top: domCoords.top - editorRect.top,
                left: domCoords.left - editorRect.left,
              };
            }
          }
        } catch (e) {
          // ignore positioning calculation error
        }

        updated.set(state.user.id, {
          userId: state.user.id,
          user: state.user,
          index: charIndex,
          coords,
        });
      });

      setRemoteCursors(updated);
    };

    awareness.on('change', updateFromAwareness);
    updateFromAwareness();

    return () => {
      awareness.off('change', updateFromAwareness);
    };
  }, [editor, provider, currentUser]);

  // Sync throttled cursor events from Socket.io
  useEffect(() => {
    if (!socket || !editor) return;

    const handleCursorUpdate = (data: {
      userId: string;
      user: AwarenessUser;
      cursor: { index: number; length: number } | null;
    }) => {
      if (data.userId === currentUser.id) return;

      setRemoteCursors((prev) => {
        const next = new Map(prev);
        if (!data.cursor) {
          next.delete(data.userId);
          return next;
        }

        let coords: { top: number; left: number } | undefined;
        try {
          if (editor.view && typeof data.cursor.index === 'number') {
            const docSize = editor.state.doc.content.size;
            const safePos = Math.min(Math.max(data.cursor.index, 0), docSize);
            const domCoords = editor.view.coordsAtPos(safePos);
            const editorEl = editor.view.dom.closest('.editor-container');
            if (editorEl) {
              const editorRect = editorEl.getBoundingClientRect();
              coords = {
                top: domCoords.top - editorRect.top,
                left: domCoords.left - editorRect.left,
              };
            }
          }
        } catch (e) {
          // ignore
        }

        next.set(data.userId, {
          userId: data.userId,
          user: data.user,
          index: data.cursor.index,
          coords,
        });
        return next;
      });
    };

    const handleUserLeft = (data: { userId: string }) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };

    socket.on('cursorUpdate', handleCursorUpdate);
    socket.on('userLeft', handleUserLeft);

    return () => {
      socket.off('cursorUpdate', handleCursorUpdate);
      socket.off('userLeft', handleUserLeft);
    };
  }, [socket, editor, currentUser]);

  return (
    <div
      id="cursor-overlay-container"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      {Array.from(remoteCursors.values()).map((rc) => {
        if (!rc.coords) return null;

        return (
          <div
            key={rc.userId}
            id={`remote-cursor-${rc.userId}`}
            className="absolute transition-all duration-75 ease-out"
            style={{
              top: `${rc.coords.top}px`,
              left: `${rc.coords.left}px`,
            }}
          >
            {/* Blinking colored caret */}
            <div
              className="w-0.5 h-5 -mt-0.5 shadow-sm"
              style={{ backgroundColor: rc.user.color }}
            />

            {/* User Name & University Tag Badge */}
            <div
              className="absolute left-0 -top-5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-md flex items-center gap-1"
              style={{ backgroundColor: rc.user.color }}
            >
              <span>{rc.user.name}</span>
              {rc.user.university && (
                <span className="opacity-80 text-[8px] uppercase tracking-wider">
                  • {rc.user.university.replace('University of ', '').replace('University', '')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
