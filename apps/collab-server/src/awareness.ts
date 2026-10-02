import { Awareness } from '@hocuspocus/awareness';
import { Server as HocuspocusServer } from '@hocuspocus/server';
import { Server as SocketIOServer } from 'socket.io';

/**
 * Sets up awareness handling for cursors and typing indicators.
 * TODO: throttle updates to 50ms, broadcast via Socket.io, and sync with Redis.
 */
export function setupAwareness(hocuspocus: HocuspocusServer, io: SocketIOServer) {
  const awareness = new Awareness({
    // Define the client state schema (e.g., user info, cursor)
    clientSchema: {
      user: {
        id: String,
        name: String,
        color: String,
      },
      cursor: {
        index: Number,
        length: Number,
      },
    },
  });

  // Listen for awareness updates from Hocuspocus and forward to Socket.io rooms
  awareness.on('update', ({ clientId, state }) => {
    // Broadcast to all rooms that the client is part of (placeholder logic)
    // The actual implementation would map clientId to document rooms
    io.emit('awarenessUpdate', { clientId, state });
  });

  // TODO: Listen for Socket.io awareness events and apply to Hocuspocus awareness
  // Example: io.on('awareness', data => awareness.setLocalStateField(...))

  // Integrate awareness with the Hocuspocus server instance
  hocuspocus.on('awarenessUpdate', ({ clientId, state }) => {
    // Forward to Socket.io if needed
    io.emit('awarenessUpdate', { clientId, state });
  });

  return awareness;
}
