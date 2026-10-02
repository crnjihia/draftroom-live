import { Server } from 'http';
import { createServer } from 'node:http';
import { createHocuspocus } from './hocuspocus';
import { createSocketIO } from './socket';

// Start HTTP server (required for Socket.io)
const httpServer: Server = createServer();

// Initialize Hocuspocus server (Yjs sync)
const hocuspocus = createHocuspocus();

// Initialize Socket.io for presence, cursors, comments
const io = createSocketIO(httpServer);

// Attach Hocuspocus to the same HTTP server (optional if using separate ports)
// For simplicity we run both on the same server
hocuspocus.listen(httpServer);

const PORT = process.env.PORT ?? 1234;
httpServer.listen(PORT, () => {
  console.log(`⚡️ Collab server listening on http://localhost:${PORT}`);
});

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('Shutting down...');
  io.close();
  hocuspocus.close();
  httpServer.close(() => process.exit(0));
});
