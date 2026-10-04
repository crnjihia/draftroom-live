# Draftroom Live ✍️

> **Draftroom Live** is a production-grade, Google-Docs-class real-time collaborative document editor engineered specifically for university group assignments (tailored for university teams at **USIU-Africa**, **University of Nairobi (UoN)**, and **Strathmore University**).

Built on **Conflict-Free Replicated Data Types (CRDTs)** with **Yjs**, **TipTap 2**, **Hocuspocus**, **Socket.io**, **Redis pub/sub**, **PostgreSQL**, and **Prisma ORM**.

---

## 🏗 System Architecture

```mermaid
flowchart TD
    subgraph Clients["University Group Members"]
        ClientA["Browser A (Amina - USIU)"]
        ClientB["Browser B (Brian - UoN)"]
        ClientC["Browser C (Faith - Strathmore)"]
    end

    subgraph WebApp["Next.js 14 Web App (App Router)"]
        Editor["TipTap 2 Editor (ProseMirror)"]
        YjsDoc["Local Y.Doc + Y.XmlFragment"]
        IndexedDB["y-indexeddb (Offline Storage)"]
        PresenceUI["Presence Bar + Live Cursor Overlay"]
        CommentUI["Comment Sidebar (Relative Positions)"]
        DiffUI["Version History + Visual Diff Modal"]
    end

    subgraph CollabServer["Draftroom Collab Server (Node.js)"]
        Hocuspocus["Hocuspocus Server (:1234)<br/>(Yjs CRDT Document Sync)"]
        SocketIO["Socket.io Server (:1234)<br/>(Presence, 50ms Cursors, Typing, Comments)"]
        RateLimiter["Room Rate Limiter<br/>(Max 20 Editors / Doc)"]
    end

    subgraph ScalingData["Data & Horizontal Scaling"]
        Redis[("Redis 7 (Pub/Sub & Adapter)")]
        Postgres[("PostgreSQL 16 (Snapshots, Versions, Comments)")]
        Prisma["Prisma ORM Engine"]
    end

    ClientA <-->|WebSocket| Hocuspocus
    ClientA <-->|Socket.io| SocketIO
    ClientB <-->|WebSocket| Hocuspocus
    ClientB <-->|Socket.io| SocketIO
    ClientC <-->|WebSocket| Hocuspocus
    ClientC <-->|Socket.io| SocketIO

    Hocuspocus <-->|Pub/Sub Scaling| Redis
    SocketIO <-->|Pub/Sub Scaling| Redis

    Hocuspocus -->|30s Autosave & Disconnect| Prisma
    Prisma <-->|Persist Snapshots & Versions| Postgres
    WebApp <-->|REST API| Postgres
```

---

## 🧬 CRDT Model (Yjs)

Draftroom Live avoids centralized lock contention and operational transformation (OT) complexity by leveraging mathematical CRDTs:
- **Document State (`Y.Doc`)**: Each group assignment document is maintained as an independent `Y.Doc`. Edits from multiple collaborators form commutative, associative, and idempotent operations merged without conflict.
- **Rich Text Binding (`Y.XmlFragment`)**: TipTap 2 ProseMirror document nodes bind directly to the `prosemirror` XML fragment in the `Y.Doc`. Formatting, lists, and headings synchronize instantaneously.
- **Comment Anchoring (`Y.RelativePosition`)**: Instead of brittle numeric indices that break when preceding text is edited, comments are anchored to CRDT item identifiers using `Y.createRelativePositionFromTypeIndex`. If Collaborator B inserts or deletes paragraphs before the anchor, resolving the relative position always points to the exact target text.
- **Live Awareness Protocol**: Collaborative cursors and typing indicators broadcast awareness state `{ user: { id, name, color, university }, cursor: { index, length } }` throttled to 50ms to prevent network congestion.
- **30-Second Autosave & Disconnect Snapshots**: Hocuspocus automatically creates binary state snapshots (`Y.encodeStateAsUpdate`) every 30 seconds and on client disconnect.
- **Content-Hash Deduplication**: Every snapshot is hashed with **SHA-256**. If no edits occurred in the 30-second window, duplicate writes to PostgreSQL are discarded.

---

## ⚡ Key Features

1. **Auth & University Profiles**
   - NextAuth with Credentials authentication.
   - 1-click university student personas:
     - 🟣 **Amina Odhiambo** (*USIU-Africa*)
     - 🔵 **Brian Kiprop** (*University of Nairobi*)
     - 🟢 **Faith Wanjiku** (*Strathmore University*)
   - Dashboard with "My Assignments" and "Shared with Me".
   - Create document with course code templates (e.g., `APT3040`, `CSC411`, `BBIT302`) and auto-generated room IDs.

2. **Real-Time Concurrent Editing**
   - TipTap 2 editor bound to Yjs CRDTs.
   - Sub-300ms propagation between concurrent editors.
   - Smooth live cursor overlay showing partner's name, caret, and university tag.
   - Typing indicator in header ("Brian is typing...").

3. **Anchored Comment Threads**
   - Select any text range to anchor feedback.
   - Comments survive concurrent edits before/after the selection.
   - Click any comment thread to jump selection directly to the anchor.
   - Reply, resolve, and re-open threads.

4. **Version History & Diff Viewer**
   - Auto-snapshot every 30 seconds (deduplicated by SHA-256 hash).
   - Create named milestone snapshots (e.g., *"Draft submitted"*, *"Final review"*).
   - Visual word-level diff viewer rendering added words in green and removed words in strikethrough red.
   - Non-destructive version restoration.

5. **Offline-Safe Autosave**
   - Integrated `y-indexeddb` local cache.
   - Edits queue locally in IndexedDB when offline.
   - Automatic differential sync upon reconnection.
   - Visual status pill: `Saved to Cloud` (green) / `Connecting...` (blue) / `Offline — will sync` (amber).

6. **Room Management & Rate Limiting**
   - Socket.io room management per assignment document.
   - Hard rate limit enforced: **maximum 20 concurrent editors per document**.

---

## 🚀 Quickstart

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Docker & Docker Compose** (optional for local PostgreSQL + Redis)

### 2. Clone and Install
```bash
git clone https://github.com/your-org/draftroom-live.git
cd draftroom-live

# Install dependencies across all workspaces
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://draftroom:password@localhost:5432/draftroom_live` |
| `REDIS_HOST` | Redis host for horizontal scaling | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `PORT` | Collab server port | `1234` |
| `NEXTAUTH_SECRET` | NextAuth JWT encryption secret | `draftroom-live-secret-super-secure-key-32chars` |
| `NEXTAUTH_URL` | NextAuth canonical URL | `http://localhost:3000` |
| `NEXT_PUBLIC_COLLAB_WS_URL` | Hocuspocus WebSocket URL | `ws://localhost:1234` |
| `NEXT_PUBLIC_COLLAB_SERVER_URL` | Socket.io server URL | `http://localhost:1234` |

### 4. Start Infrastructure (Docker Compose)
```bash
docker compose up -d postgres redis
```

Generate Prisma client:
```bash
npm run prisma:generate
```

### 5. Run the Collab Server & Next.js Web App
In terminal 1 (Collab Server):
```bash
npm run dev -w apps/collab-server
```

In terminal 2 (Next.js Web App):
```bash
npm run dev -w apps/web
```

Visit **[http://localhost:3000](http://localhost:3000)** to start collaborating!

---

## 🧪 Testing

### Unit Tests (Vitest)
Tests Yjs RelativePosition comment anchoring and SHA-256 version deduplication:
```bash
npm test
```

### End-to-End Tests (Playwright)
Multi-context test validating 2 users editing simultaneously, live cursor sync, comments, and versions:
```bash
npm run test:e2e
```

---

## 📦 Project Structure

```
draftroom-live/
├── apps/
│   ├── web/                              # Next.js 14 App Router UI
│   │   ├── src/app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx              # University assignment dashboard
│   │   │   │   ├── documents/create/     # New assignment creation
│   │   │   │   └── documents/[id]/page.tsx # Collaborative document room
│   │   │   ├── auth/signin/page.tsx      # Demo student 1-click login
│   │   │   └── api/                      # REST endpoints for docs, comments, versions
│   │   ├── src/components/editor/
│   │   │   ├── Editor.tsx                # TipTap 2 + Yjs binding
│   │   │   ├── CursorOverlay.tsx         # Live remote collaborator carets
│   │   │   ├── PresenceBar.tsx           # Avatars, typing status, sync indicators
│   │   │   ├── CommentSidebar.tsx        # Anchored comment threads & replies
│   │   │   ├── VersionHistory.tsx        # Milestone snapshots list
│   │   │   └── VersionDiff.tsx           # Read-only visual diff preview modal
│   │   ├── src/hooks/useYjs.ts           # Central Y.Doc, Hocuspocus & Socket hook
│   │   └── src/lib/yjs/                  # RelativePosition & LCS word diff algorithms
│   ├── collab-server/                    # Node.js Collab Server (:1234)
│   │   ├── src/index.ts                  # Server entry & graceful shutdown
│   │   ├── src/hocuspocus.ts             # Hocuspocus Yjs sync + Redis extension
│   │   ├── src/socket.ts                 # Socket.io room management & rate limiting
│   │   ├── src/awareness.ts              # 50ms throttled awareness coordinator
│   │   └── src/persistence.ts            # PostgreSQL snapshots + SHA-256 dedup
│   └── shared/                           # Shared TypeScript types & Prisma client
├── prisma/schema.prisma                  # Data models for PostgreSQL
├── docker-compose.yml                    # Postgres + Redis + Collab container stack
├── e2e/collaboration.spec.ts             # Playwright multi-context collaboration test
├── LICENSE                               # MIT License
└── README.md                             # Documentation
```

---

## 📄 License
Released under the [MIT License](LICENSE).
