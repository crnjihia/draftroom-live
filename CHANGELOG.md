# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automated GitHub Container Registry (GHCR) multi-arch image builds for `web` and `collab`.
- Automated release bundle packaging with `docker-compose.release.yml`.
- Multi-instance Redis Pub/Sub awareness synchronization adapter.

### Changed
- Refactored root TypeScript configuration to exclude workspace applications and resolve project reference composite constraints.
- Optimized Vitest `@studyroom/shared` module alias to compile directly from TypeScript source.

---

## [0.1.0] - 2026-10-05

### Added
- **Real-Time CRDT Editor**: TipTap 2 ProseMirror-based rich text editor directly bound to `Y.Doc` and `Y.XmlFragment` for zero merge conflicts.
- **Collaborator Carets & Presence**: Live remote cursors, colored caret indicators, and university student affiliation badges (USIU-Africa, University of Nairobi, Strathmore University).
- **Drift-Free Anchored Comments**: Comments anchored to CRDT item coordinates via `Y.RelativePosition`, surviving concurrent insertions and deletions.
- **Milestone Snapshots & Diff Viewer**: 30-second automated autosaves with SHA-256 content deduplication, named version checkpoints, and word-level LCS visual diff preview modal.
- **Full-Stack Light & Dark Mode**: Persistent theme switcher (`studyroom-theme`) with anti-FOUC inline script, custom dark ProseMirror typography, comment highlights, and sleek scrollbars.
- **Offline-Safe Autosave**: Local document caching via `y-indexeddb` with automatic differential synchronization upon reconnection.
- **Container Infrastructure**: Production multi-stage Dockerfiles for Next.js web application (`apps/web/Dockerfile`) and Socket.io/Yjs collaboration server (`apps/collab-server/Dockerfile`).
- **5-Service Docker Stack**: Complete local development stack with PostgreSQL 16, Redis 7, Prisma migration runner, collab server, and web client.

[Unreleased]: https://github.com/crnjihia/studyroom-live/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/crnjihia/studyroom-live/releases/tag/v0.1.0
