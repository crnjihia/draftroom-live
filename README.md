<div align="center">

# Draftroom Live ✍️

**Google-Docs-class, real-time collaborative document editor engineered with mathematical CRDTs for university group assignments.**

[![CI](https://github.com/your-org/draftroom-live/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/draftroom-live/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-black.svg?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TipTap](https://img.shields.io/badge/TipTap-2.x_ProseMirror-teal.svg?logo=prosemirror&logoColor=white)](https://tiptap.dev/)
[![Yjs CRDT](https://img.shields.io/badge/CRDT-Yjs_v13-orange.svg)](https://github.com/yjs/yjs)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black.svg?logo=socket.io&logoColor=white)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748.svg?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x_Pub%2FSub-DC382D.svg?logo=redis&logoColor=white)](https://redis.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<br />

<p align="center">
  <img src="docs/screenshots/dashboard-dark.png" alt="Draftroom Live Dark Mode Dashboard" width="900" style="border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);" />
</p>

*Draftroom Live Dashboard — featuring university assignment workspaces, live presence, and seamless dark mode.*

</div>

---

## 📖 Overview

**Draftroom Live** is an open-source, production-grade collaborative document platform tailored for high-concurrency university group assignments. Built to eliminate the friction of group projects across Kenyan universities (**USIU-Africa**, **University of Nairobi**, and **Strathmore University**), Draftroom Live combines peer-to-peer CRDT primitives with centralized cloud durability.

Traditional editors rely on centralized Operational Transformation (OT) or lock-based mechanics that trigger merge conflicts and clunky overwrite warnings. Draftroom Live solves this at the data structure level:
- Every keystroke operates on a **commutative, associative, and idempotent CRDT model** (`Y.Doc`).
- Comment anchors dynamically adjust to paragraph insertions via **mathematical relative positions** (`Y.RelativePosition`).
- Document snapshots are automatically deduplicated in PostgreSQL via **SHA-256 hashing**.
- Complete client-side resilience with **`y-indexeddb` offline-first cache**.

---

## 🏗 Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Clients["University Collaborators (Browsers)"]
        ClientA["Browser A (Amina - USIU-Africa)"]
        ClientB["Browser B (Brian - Univ. of Nairobi)"]
        ClientC["Browser C (Faith - Strathmore Univ.)"]
    end

    subgraph WebApp["Next.js 14 Web Application (App Router)"]
        TipTapEditor["TipTap 2 Editor (ProseMirror Engine)"]
        YDocState["Local Y.Doc + Y.XmlFragment"]
        IndexedDB["y-indexeddb (Offline Resilience)"]
        Theme["Theme Engine (Instant No-FOUC Dark/Light)"]
        CursorOverlay["Live Cursor Overlay (50ms Throttled)"]
        CommentSidebar["Anchored Comments (Relative Positions)"]
        VersionDiff["Version History & Visual LCS Diff Modal"]
    end

    subgraph CollabServer["Draftroom Collab Server (:1234)"]
        Hocuspocus["Hocuspocus WebSocket Server<br/>(Yjs CRDT Document Synchronization)"]
        SocketIO["Socket.io Real-time Coordinator<br/>(Presence, Carets, Typing, Comments)"]
        RoomGuard["Room Concurrency Guard<br/>(Max 20 Active Editors / Room)"]
    end

    subgraph Infrastructure["Data Tier & Horizontal Scaling"]
        RedisCluster[("Redis 7 Pub/Sub & Adapter<br/>(Multi-Server State Replication)")]
        PostgresDB[("PostgreSQL 16 Database<br/>(Users, Documents, Snapshots, Comments)")]
        PrismaClient["Prisma ORM Engine"]
    end

    ClientA <-->|WebSocket Sync| Hocuspocus
    ClientA <-->|Socket.io Events| SocketIO
    ClientB <-->|WebSocket Sync| Hocuspocus
    ClientB <-->|Socket.io Events| SocketIO
    ClientC <-->|WebSocket Sync| Hocuspocus
    ClientC <-->|Socket.io Events| SocketIO

    Hocuspocus <-->|Cross-Server Pub/Sub| RedisCluster
    SocketIO <-->|Cross-Server Broadcasts| RedisCluster

    Hocuspocus -->|30s Autosave & Disconnect| PrismaClient
    PrismaClient <-->|SHA-256 Dedup Writes| PostgresDB
    WebApp <-->|REST Endpoints| PostgresDB
```

---

## ⚡ Key Technical Features

### 1. 🧬 Conflict-Free Real-Time Editing (CRDTs)
- **Sub-300ms Latency**: TipTap 2 ProseMirror document nodes are synchronized directly with Yjs's `Y.XmlFragment`.
- **Zero Merge Conflicts**: Edits commute cleanly across concurrent peer nodes regardless of arrival order or temporary network partitions.

### 2. 📍 Drift-Free Comment Anchoring
- Standard document editors anchor comments to numeric string indices (e.g. `chars 120-145`), causing comments to detach whenever preceding text is inserted or deleted.
- Draftroom Live implements `Y.createRelativePositionFromTypeIndex`, binding comments directly to CRDT Item IDs:
  $$\text{RelativePosition} = (\text{TypeID}, \text{ItemClock}, \text{Offset})$$
- When collaborators type or remove paragraphs ahead of a comment, resolving the anchor points cleanly to the updated character positions.

### 3. 🎯 50ms Throttled Live Cursors & Typing Awareness
- Collaborators see real-time cursor carets with custom brand colors and university affiliation tags (*e.g. "Brian • Univ. of Nairobi"*).
- Awareness events are rate-limited to **50ms intervals**, ensuring butter-smooth tracking while preventing network flooding.

### 4. 🕒 Named Milestones & SHA-256 Snapshot Deduplication
- **Automated 30-Second Snapshots**: Hocuspocus automatically captures binary document states (`Y.encodeStateAsUpdate`) periodically and upon client disconnect.
- **Content-Hash Deduplication**: Each snapshot is hashed with **SHA-256**. Identical document states without edits skip redundant database writes.
- **Word-Level Visual Diffing**: Compare any historical snapshot with the live document via a customized Longest Common Subsequence (LCS) diff modal.
- **Non-Destructive Restoration**: Restore historical versions by generating a new forward-moving snapshot without rewriting history.

### 5. 🌗 Complete Light & Dark Mode
- Built with a tailored slate/indigo palette (`slate-950`, `slate-900`, `slate-800`).
- Persistent storage (`localStorage.getItem('draftroom-theme')`) with system `prefers-color-scheme` fallback.
- **Anti-FOUC** inline `<head>` execution script to eliminate white flashes on cold reloads.
- Dark-themed ProseMirror typography, comment highlights, carets, and custom scrollbars.

### 6. 📴 Offline-Safe Autosave with Differential Replay
- Local edits are continuously cached in the browser using `y-indexeddb`.
- When offline, editing remains fully operational. Upon reconnection, accumulated binary updates are differentially reconciled with the cloud.
- Visual connection status pill:
  - 🟢 **Saved to Cloud**
  - 🔵 **Connecting...**
  - 🟠 **Offline — will sync**

### 7. 🎓 University Group Assignments Context
- Built-in university student personas for instant 1-click evaluation:
  - 🟣 **Amina Odhiambo** (*USIU-Africa*)
  - 🔵 **Brian Kiprop** (*University of Nairobi*)
  - 🟢 **Faith Wanjiku** (*Strathmore University*)
- Course assignment presets (e.g., `APT3040: Distributed Systems`, `CSC411: Operating Systems`, `BBIT302: Enterprise Architecture`).

---

## 🛠 Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router) | Server components, routing, optimized bundle delivery |
| **Rich Text Editor** | TipTap 2 / ProseMirror | Extensible, schema-backed structured document engine |
| **CRDT Engine** | Yjs (`yjs`, `@tiptap/extension-collaboration`) | Decentralized conflict-free replication |
| **Collab Server** | Hocuspocus + Socket.io | WebSocket document sync, presence coordinator, rate limiting |
| **Styling & UI** | Tailwind CSS 3 + Lucide Icons | Responsive modern design system with class-based dark mode |
| **Database** | PostgreSQL 16 | Relational storage for snapshots, named versions, comments |
| **ORM** | Prisma 5 | Type-safe migrations and relational database access |
| **Distributed Scaling** | Redis 7 (Pub/Sub & Adapter) | Horizontal multi-server synchronization |
| **Testing** | Vitest + Playwright | Unit testing for CRDT math and multi-context E2E suites |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Docker & Docker Compose** (for PostgreSQL and Redis)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/draftroom-live.git
cd draftroom-live
```

### Step 2: Install Dependencies
Draftroom Live is organized as an npm workspace monorepo:
```bash
npm install
```

### Step 3: Setup Environment Variables
Copy `.env.example` into `.env`:
```bash
cp .env.example .env
```

| Key | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://draftroom:password@localhost:5432/draftroom_live?schema=public` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `PORT` | Collab server port | `1234` |
| `NEXTAUTH_SECRET` | NextAuth JWT secret | `draftroom-live-secret-super-secure-key-32chars` |
| `NEXTAUTH_URL` | NextAuth base URL | `http://localhost:3000` |
| `NEXT_PUBLIC_COLLAB_WS_URL` | Hocuspocus WebSocket endpoint | `ws://localhost:1234` |
| `NEXT_PUBLIC_COLLAB_SERVER_URL` | Socket.io HTTP/WS endpoint | `http://localhost:1234` |

---

### Step 4: Start Infrastructure (Docker)
Start the PostgreSQL and Redis containers in the background:
```bash
docker compose up -d postgres redis
```

Generate the Prisma client:
```bash
npm run prisma:generate
```

Push schema migrations and seed demo university data:
```bash
npm run prisma:push --workspace=@draftroom/shared
node prisma/seed.js
```

---

### Step 5: Start the Development Services

In **Terminal 1** (Collab Server):
```bash
npm run dev -w apps/collab-server
```

In **Terminal 2** (Next.js Web App):
```bash
npm run dev -w apps/web
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🧪 Testing

### Unit Tests (Vitest)
Executes unit tests validating CRDT comment anchoring under concurrent insertions/deletions and SHA-256 snapshot deduplication:
```bash
npm test
```

### End-to-End Multi-Context Tests (Playwright)
Simulates concurrent multi-user editing in isolated browser contexts:
```bash
npm run test:e2e
```

---

## 📁 Repository Structure

```
draftroom-live/
├── .github/
│   ├── workflows/ci.yml                  # GitHub Actions CI build & test pipeline
│   ├── ISSUE_TEMPLATE/                   # Bug report & feature request templates
│   └── PULL_REQUEST_TEMPLATE.md          # Standard PR checklist
├── apps/
│   ├── web/                              # Next.js 14 App Router Web Application
│   │   ├── src/app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx              # University dashboard with assignment cards
│   │   │   │   ├── documents/create/     # New assignment generator with course presets
│   │   │   │   └── documents/[id]/       # Document room page
│   │   │   ├── auth/signin/page.tsx      # Demo 1-click university student login
│   │   │   └── api/                      # REST APIs (documents, comments, versions)
│   │   ├── src/components/
│   │   │   ├── ThemeToggle.tsx           # Reusable Sun/Moon theme switcher
│   │   │   └── editor/
│   │   │       ├── Editor.tsx            # TipTap 2 + Yjs binding and toolbar
│   │   │       ├── CursorOverlay.tsx     # Remote collaborator carets & university tags
│   │   │       ├── PresenceBar.tsx       # Avatars, typing status, sync indicators
│   │   │       ├── CommentSidebar.tsx    # Anchored comment threads, replies, resolve
│   │   │       ├── VersionHistory.tsx    # Snapshot timeline & milestone creation
│   │   │       └── VersionDiff.tsx       # Read-only word diff viewer modal
│   │   ├── src/context/ThemeContext.tsx  # Theme provider & persistence
│   │   ├── src/hooks/useYjs.ts           # Central Y.Doc, Hocuspocus & Socket.io hook
│   │   └── src/lib/yjs/                  # RelativePosition & LCS word diff algorithms
│   ├── collab-server/                    # Node.js Collab Server (:1234)
│   │   ├── src/index.ts                  # Server bootstrap & graceful shutdown
│   │   ├── src/hocuspocus.ts             # Hocuspocus Yjs sync + Redis extension
│   │   ├── src/socket.ts                 # Socket.io room management & rate limiting
│   │   ├── src/awareness.ts              # 50ms throttled awareness coordinator
│   │   └── src/persistence.ts            # PostgreSQL snapshots + SHA-256 dedup
│   └── shared/                           # Shared TypeScript types & Prisma client
├── docs/
│   └── screenshots/                      # High-resolution screenshots for showcase
├── prisma/
│   ├── schema.prisma                     # PostgreSQL schema definition
│   └── seed.js                           # Seed script with demo students & assignments
├── docker-compose.yml                    # Container stack (Postgres + Redis)
├── CONTRIBUTING.md                       # Open-source contribution guidelines
├── CODE_OF_CONDUCT.md                    # Community code of conduct
├── LICENSE                               # MIT License
└── README.md                             # Project documentation
```

---

## 🤝 Contributing

Contributions are warmly welcomed! Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting pull requests.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
