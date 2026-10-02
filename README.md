# Andika Live

> Real‑time collaborative document editor for university group assignments.

## Architecture

```mermaid
flowchart TD
    Browser[Browser (Next.js UI)] -->|WebSocket| Hocuspocus[Hocuspocus Server]
    Hocuspocus -->|Pub/Sub| Redis[Redis]
    Hocuspocus -->|DB| Postgres[PostgreSQL]
    Browser -->|Socket.io| SocketIO[Socket.io Server]
    SocketIO -->|Pub/Sub| Redis
```

- **Next.js** – UI layer with TipTap editor.
- **Hocuspocus** – Yjs document sync over WebSockets.
- **Socket.io** – Presence, cursors, comments.
- **Redis** – Pub/Sub for horizontal scaling of both servers.
- **PostgreSQL** – Persistent storage for snapshots, versions, comments.
- **Prisma** – ORM for DB access.

## CRDT Explanation

Andika Live uses **Yjs**, a CRDT library that represents the document as a **Y.Doc**. Edits are applied locally and merged automatically across clients without conflicts. The editor UI (TipTap) binds to a **Y.XmlFragment** that holds the rich‑text structure. Presence information (cursor location, user info) is propagated via **Awareness** protocol.

## Quickstart

```bash
# Clone repo
git clone <repo-url>
cd andika-live

# Install dependencies (workspace root)
npm install

# Set up environment variables (example .env)
cp .env.example .env
# Edit .env with your DB credentials

# Start services
docker compose up -d

# Run the web app (in a separate terminal)
npm run dev --workspace=apps/web

# Run collab server (in a separate terminal)
npm run dev --workspace=apps/collab-server
```

Visit `http://localhost:3000` to see the app.

## Scaling Notes
- **Redis** is used for pub/sub between multiple instances of the Hocuspocus and Socket.io servers.
- Connection limits (max 20 editors per document) are enforced in the Socket.io server.
- Autosave snapshots are stored in PostgreSQL; snapshots are deduplicated by content hash to avoid redundant storage.

## Development

- Run tests: `npm run test`
- Run Playwright E2E: `npm run test:e2e`

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
