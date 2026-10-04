'use client';

import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { AwarenessUser } from '@draftroom/shared';
import { ConnectionStatus } from '@/hooks/useYjs';
import {
  Users,
  Wifi,
  WifiOff,
  RefreshCw,
  MessageSquare,
  History,
  Share2,
  CheckCircle2,
} from 'lucide-react';

interface PresenceBarProps {
  documentId: string;
  provider: HocuspocusProvider | null;
  socket: Socket | null;
  status: ConnectionStatus;
  isSynced: boolean;
  currentUser: AwarenessUser;
  onToggleComments: () => void;
  onToggleVersions: () => void;
  showComments: boolean;
  showVersions: boolean;
  commentCount: number;
}

export default function PresenceBar({
  documentId,
  provider,
  socket,
  status,
  isSynced,
  currentUser,
  onToggleComments,
  onToggleVersions,
  showComments,
  showVersions,
  commentCount,
}: PresenceBarProps) {
  const [users, setUsers] = useState<AwarenessUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync awareness from Hocuspocus provider
  useEffect(() => {
    if (!provider || !provider.awareness) return;

    const awareness = provider.awareness;
    const updateUsers = () => {
      const states = awareness.getStates();
      const active: AwarenessUser[] = [];
      const seen = new Set<string>();

      states.forEach((st) => {
        if (st && st.user && !seen.has(st.user.id)) {
          seen.add(st.user.id);
          active.push(st.user);
        }
      });

      // Ensure current user is included
      if (!seen.has(currentUser.id)) {
        active.unshift(currentUser);
      }

      setUsers(active);
    };

    awareness.on('change', updateUsers);
    updateUsers();

    return () => {
      awareness.off('change', updateUsers);
    };
  }, [provider, currentUser]);

  // Sync presence and typing from Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = (data: { user: AwarenessUser }) => {
      setUsers((prev) => {
        if (prev.some((u) => u.id === data.user.id)) return prev;
        return [...prev, data.user];
      });
    };

    const handleUserLeft = (data: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.id !== data.userId));
      setTypingUsers((prev) => prev.filter((name) => name !== data.userId));
    };

    const handlePresenceSync = (data: { users: AwarenessUser[] }) => {
      if (Array.isArray(data.users) && data.users.length > 0) {
        setUsers((prev) => {
          const merged = [...prev];
          data.users.forEach((u) => {
            if (!merged.some((m) => m.id === u.id)) {
              merged.push(u);
            }
          });
          return merged;
        });
      }
    };

    const handleUserTyping = (data: {
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => {
      setTypingUsers((prev) => {
        if (data.isTyping) {
          if (!prev.includes(data.userName)) return [...prev, data.userName];
          return prev;
        } else {
          return prev.filter((n) => n !== data.userName);
        }
      });
    };

    socket.on('userJoined', handleUserJoined);
    socket.on('userLeft', handleUserLeft);
    socket.on('presenceSync', handlePresenceSync);
    socket.on('userTyping', handleUserTyping);

    return () => {
      socket.off('userJoined', handleUserJoined);
      socket.off('userLeft', handleUserLeft);
      socket.off('presenceSync', handlePresenceSync);
      socket.off('userTyping', handleUserTyping);
    };
  }, [socket]);

  const copyShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
      {/* Connection & Sync Status Indicator */}
      <div className="flex items-center space-x-3">
        {status === 'connected' ? (
          <div
            id="connection-status"
            className="flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Wifi className="w-3.5 h-3.5" />
            <span>Saved to Cloud</span>
          </div>
        ) : status === 'connecting' ? (
          <div
            id="connection-status"
            className="flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Connecting...</span>
          </div>
        ) : (
          <div
            id="connection-status"
            className="flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full"
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline — will sync</span>
          </div>
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div
            id="typing-indicator"
            className="text-xs font-medium text-slate-500 italic animate-pulse flex items-center gap-1.5"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>
              {typingUsers.slice(0, 2).join(', ')}
              {typingUsers.length > 2
                ? ` and ${typingUsers.length - 2} others`
                : ''}{' '}
              typing...
            </span>
          </div>
        )}
      </div>

      {/* Online Collaborator Avatars & Controls */}
      <div className="flex items-center space-x-3">
        {/* Avatars */}
        <div id="collaborator-avatars" className="flex items-center -space-x-2 mr-2">
          {users.map((u) => {
            const initials = u.name
              ? u.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : 'U';
            const isMe = u.id === currentUser.id;

            return (
              <div
                key={u.id}
                className="relative group cursor-pointer"
                title={`${u.name} (${u.university || 'Collaborator'}) ${isMe ? '(You)' : ''}`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-sm ring-1 ring-slate-200 transition-transform hover:scale-110 hover:z-20"
                  style={{ backgroundColor: u.color }}
                >
                  {initials}
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap shadow-lg z-30 pointer-events-none">
                  <p className="font-semibold">{u.name} {isMe && '(You)'}</p>
                  <p className="text-[10px] text-slate-300">{u.university}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Share Button */}
        <button
          onClick={copyShareLink}
          className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
          title="Share document link"
        >
          {copiedLink ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </>
          )}
        </button>

        {/* Version History Toggle */}
        <button
          id="btn-version-history"
          onClick={onToggleVersions}
          className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
            showVersions
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Versions</span>
        </button>

        {/* Comments Sidebar Toggle */}
        <button
          id="btn-comment-sidebar"
          onClick={onToggleComments}
          className={`flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
            showComments
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Comments</span>
          {commentCount > 0 && (
            <span
              id="comment-count-badge"
              className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-bold rounded-full"
            >
              {commentCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
