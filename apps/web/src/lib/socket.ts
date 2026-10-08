import { io, Socket } from 'socket.io-client';
import { AwarenessUser } from '@studyroom/shared';

const COLLAB_SERVER_URL =
  process.env.NEXT_PUBLIC_COLLAB_SERVER_URL || 'http://localhost:1234';

/**
 * Initializes a Socket.io client connection for room management,
 * awareness avatars, live cursor overlay, and typing indicators.
 */
export function createCollabSocket(docId: string, user: AwarenessUser): Socket {
  const socket = io(COLLAB_SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log(`[Socket.io Client] Connected. Joining room for doc: ${docId}`);
    socket.emit('joinDoc', { docId, user });
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket.io Client] Connection error:', err.message);
  });

  return socket;
}
