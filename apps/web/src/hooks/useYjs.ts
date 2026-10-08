'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { setupIndexedDBPersistence } from '@/lib/offline';
import { createCollabSocket } from '@/lib/socket';
import { AwarenessUser } from '@studyroom/shared';
import { Socket } from 'socket.io-client';

const COLLAB_WS_URL =
  process.env.NEXT_PUBLIC_COLLAB_WS_URL || 'ws://localhost:1234';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface UseYjsOptions {
  documentId: string;
  user?: Partial<AwarenessUser>;
}

export function useYjs({ documentId, user }: UseYjsOptions) {
  // Stable current user identity
  const currentUser: AwarenessUser = useMemo(() => {
    const id = user?.id || `user-${Math.random().toString(36).slice(2, 7)}`;
    const name = user?.name || `Student ${id.slice(-4)}`;
    const color =
      user?.color ||
      ['#8b5cf6', '#0284c7', '#059669', '#d97706', '#dc2626'][
        Math.floor(Math.random() * 5)
      ];
    return {
      id,
      name,
      color,
      university: user?.university || 'University',
    };
  }, [user?.id, user?.name, user?.color, user?.university]);

  // Stable Y.Doc per document
  const ydoc = useMemo(() => new Y.Doc(), [documentId]);

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize Hocuspocus Provider
  const provider = useMemo(() => {
    if (typeof window === 'undefined') return null;

    const hpProvider = new HocuspocusProvider({
      url: COLLAB_WS_URL,
      name: documentId,
      document: ydoc,
      onConnect: () => {
        setStatus('connected');
      },
      onClose: () => {
        setStatus('disconnected');
      },
      onSynced: () => {
        setIsSynced(true);
      },
      onDisconnect: () => {
        setStatus('disconnected');
      },
      onStatus: (event) => {
        if (event.status === 'connected' || event.status === 'connecting' || event.status === 'disconnected') {
          setStatus(event.status);
        }
      },
    });

    return hpProvider;
  }, [documentId, ydoc]);

  // Set user awareness state on Hocuspocus provider
  useEffect(() => {
    if (!provider || !provider.awareness) return;

    provider.awareness.setLocalStateField('user', {
      id: currentUser.id,
      name: currentUser.name,
      color: currentUser.color,
      university: currentUser.university,
    });
  }, [provider, currentUser]);

  // Initialize offline IndexedDB storage
  useEffect(() => {
    const indexedDb = setupIndexedDBPersistence(documentId, ydoc, () => {
      // Local cache hydrated
    });

    return () => {
      indexedDb?.destroy();
    };
  }, [documentId, ydoc]);

  // Initialize Socket.io connection for room presence & typing indicators
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sock = createCollabSocket(documentId, currentUser);
    setSocket(sock);

    return () => {
      sock.disconnect();
    };
  }, [documentId, currentUser]);

  // Cleanup on unmount or document change
  useEffect(() => {
    return () => {
      if (provider) {
        provider.disconnect();
        provider.destroy();
      }
      ydoc.destroy();
    };
  }, [provider, ydoc]);

  return {
    ydoc,
    provider,
    socket,
    status,
    isSynced,
    user: currentUser,
  };
}
