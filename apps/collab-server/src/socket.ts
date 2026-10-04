import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import Redis from 'ioredis';
import { AwarenessState, AwarenessUser } from '@draftroom/shared';
import { awarenessThrottler, presenceStore } from './awareness';

const MAX_EDITORS_PER_DOC = 20;

/**
 * Creates and configures the Socket.io server for:
 * - Room presence & avatars (USIU, UoN, Strathmore university students)
 * - 50ms-throttled live cursors
 * - Typing indicators
 * - Real-time comment threads
 * - Rate limiting (max 20 editors per doc)
 * - Horizontal scaling via Redis pub/sub
 */
export function createSocketIO(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Optional Redis pub/sub for horizontal multi-instance scaling
  let redisPub: Redis | null = null;
  let redisSub: Redis | null = null;

  if (process.env.REDIS_HOST || process.env.REDIS_URL) {
    try {
      const redisOptions = process.env.REDIS_URL
        ? process.env.REDIS_URL
        : {
            host: process.env.REDIS_HOST ?? 'localhost',
            port: Number(process.env.REDIS_PORT ?? 6379),
            lazyConnect: true,
            maxRetriesPerRequest: 1,
          };

      redisPub = new Redis(redisOptions as any);
      redisSub = new Redis(redisOptions as any);

      redisPub.on('error', (err) => {
        console.warn('[Socket.io Redis Pub] Redis not available, using in-memory mode:', err.message);
      });
      redisSub.on('error', (err) => {
        console.warn('[Socket.io Redis Sub] Redis not available, using in-memory mode:', err.message);
      });

      // Subscribe to cross-instance room events
      redisSub.subscribe('draftroom:collab:broadcast', () => {
        console.log('[Socket.io] Connected to Redis pub/sub for horizontal scaling');
      });

      redisSub.on('message', (channel, message) => {
        if (channel === 'draftroom:collab:broadcast') {
          try {
            const { docId, event, data, originSocketId } = JSON.parse(message);
            io.to(docId).except(originSocketId).emit(event, data);
          } catch (e) {
            // ignore malformed message
          }
        }
      });
    } catch (e) {
      console.warn('[Socket.io] Initialized without Redis pub/sub (in-memory mode)');
    }
  }

  const broadcastCrossInstance = (docId: string, event: string, data: any, originSocketId: string) => {
    // Local broadcast to room
    io.to(docId).except(originSocketId).emit(event, data);

    // Redis broadcast for other server instances
    if (redisPub && redisPub.status === 'ready') {
      redisPub.publish(
        'draftroom:collab:broadcast',
        JSON.stringify({ docId, event, data, originSocketId })
      );
    }
  };

  io.on('connection', (socket: Socket) => {
    let currentDocId: string | null = null;
    let currentUser: AwarenessUser | null = null;

    // Join Document Room with max 20 editors rate limit
    socket.on('joinDoc', ({ docId, user }: { docId: string; user: AwarenessUser }) => {
      if (!docId || !user) return;

      const room = io.sockets.adapter.rooms.get(docId);
      const currentCount = room ? room.size : 0;

      if (currentCount >= MAX_EDITORS_PER_DOC) {
        socket.emit('error', {
          message: `Connection limit reached: Maximum ${MAX_EDITORS_PER_DOC} concurrent editors allowed per document.`,
        });
        socket.disconnect(true);
        return;
      }

      currentDocId = docId;
      currentUser = user;

      socket.join(docId);

      const awarenessState: AwarenessState = {
        user,
        cursor: null,
        typing: false,
      };

      presenceStore.setPresence(docId, socket.id, awarenessState);

      // Send existing active users in room to the newly joined client
      const activeUsers = presenceStore.getDocumentUsers(docId);
      socket.emit('presenceSync', { users: activeUsers });

      // Broadcast join to other collaborators in room
      broadcastCrossInstance(docId, 'userJoined', { user }, socket.id);
      console.log(`[Socket.io] ${user.name} joined doc ${docId} (${currentCount + 1}/${MAX_EDITORS_PER_DOC})`);
    });

    // Cursor position updates throttled to 50ms
    socket.on('cursorMove', (data: { docId: string; cursor: { index: number; length: number } | null }) => {
      const docId = data.docId || currentDocId;
      if (!docId || !currentUser) return;

      const throttleKey = `${docId}:${socket.id}`;
      awarenessThrottler.throttle(throttleKey, () => {
        presenceStore.setPresence(docId, socket.id, {
          user: currentUser!,
          cursor: data.cursor,
        });

        broadcastCrossInstance(
          docId,
          'cursorUpdate',
          {
            userId: currentUser!.id,
            user: currentUser,
            cursor: data.cursor,
          },
          socket.id
        );
      });
    });

    // Typing indicator
    socket.on('typing', (data: { docId: string; isTyping: boolean }) => {
      const docId = data.docId || currentDocId;
      if (!docId || !currentUser) return;

      broadcastCrossInstance(
        docId,
        'userTyping',
        {
          userId: currentUser.id,
          userName: currentUser.name,
          isTyping: data.isTyping,
        },
        socket.id
      );
    });

    // Real-time comment thread updates
    socket.on('newCommentThread', (data: { docId: string; thread: any }) => {
      const docId = data.docId || currentDocId;
      if (!docId) return;
      broadcastCrossInstance(docId, 'commentThreadCreated', data.thread, socket.id);
    });

    socket.on('commentAdded', (data: { docId: string; threadId: string; comment: any }) => {
      const docId = data.docId || currentDocId;
      if (!docId) return;
      broadcastCrossInstance(docId, 'commentAdded', data, socket.id);
    });

    socket.on('resolveCommentThread', (data: { docId: string; threadId: string; resolved: boolean }) => {
      const docId = data.docId || currentDocId;
      if (!docId) return;
      broadcastCrossInstance(docId, 'commentThreadResolved', data, socket.id);
    });

    // Real-time named version notifications
    socket.on('namedVersionCreated', (data: { docId: string; version: any }) => {
      const docId = data.docId || currentDocId;
      if (!docId) return;
      broadcastCrossInstance(docId, 'versionCreated', data.version, socket.id);
    });

    // Handle clean leave
    socket.on('leaveDoc', (data: { docId: string }) => {
      const docId = data.docId || currentDocId;
      if (docId) {
        socket.leave(docId);
        presenceStore.removePresence(docId, socket.id);
        awarenessThrottler.clear(`${docId}:${socket.id}`);
        if (currentUser) {
          broadcastCrossInstance(docId, 'userLeft', { userId: currentUser.id }, socket.id);
        }
      }
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      if (currentDocId) {
        presenceStore.removePresence(currentDocId, socket.id);
        awarenessThrottler.clear(`${currentDocId}:${socket.id}`);
        if (currentUser) {
          broadcastCrossInstance(currentDocId, 'userLeft', { userId: currentUser.id }, socket.id);
          console.log(`[Socket.io] ${currentUser.name} left doc ${currentDocId}`);
        }
      }
    });
  });

  return io;
}
