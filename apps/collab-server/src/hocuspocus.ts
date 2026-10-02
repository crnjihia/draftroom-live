import { Server as HocuspocusServer } from '@hocuspocus/server';
import { RedisExtension } from '@hocuspocus/redis';
import { prisma } from '../shared/prisma/client'; // Placeholder import; actual path may differ

/**
 * Creates a Hocuspocus server instance.
 * TODO: configure persistence (PostgreSQL), Redis extension, and awareness throttling.
 */
export function createHocuspocus() {
  const server = new HocuspocusServer({
    extensions: [
      new RedisExtension({
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
      }),
      // Additional extensions (e.g., persistence) will be added later
    ],
    // TODO: Provide a name for the document (e.g., from request params)
    // onConnect, onDisconnect callbacks can be added for logging
  });

  // Placeholder for listening on a server instance – caller will invoke server.listen(httpServer)
  return server;
}
