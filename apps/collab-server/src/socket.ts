import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createClient as createRedisClient } from 'ioredis';

/**
 * Creates a Socket.io server for presence, cursors, and comments.
 * TODO: Integrate with Redis pub/sub for multi‑instance scaling, enforce connection limits, and throttle awareness updates.
 */
export function createSocketIO(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const redis = createRedisClient({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
  });

  // Broadcast events via Redis pub/sub (placeholder)
  // TODO: Subscribe to Redis channels and forward to sockets

  io.on('connection', socket => {
    console.log(`🟢 Socket.io client connected: ${socket.id}`);
    // TODO: Join document rooms, handle presence, cursors, comments
    socket.on('joinDoc', (docId: string) => {
      socket.join(docId);
      // Emit presence info to room (placeholder)
      socket.to(docId).emit('userJoined', { socketId: socket.id });
    });

    socket.on('disconnect', () => {
      console.log(`🔴 Socket.io client disconnected: ${socket.id}`);
      // TODO: Clean up presence data
    });
  });

  // TODO: Bind Redis pub/sub events to socket broadcasts

  return io;
}
