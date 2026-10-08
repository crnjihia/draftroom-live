# Contributing to StudyRoom Live ✍️

Thank you for your interest in contributing to StudyRoom Live! I welcome contributions from developers, researchers, and university students interested in CRDTs, real-time systems, and collaborative web applications.

---

## 🧭 Code of Conduct

Please treat all contributors with respect and professionalism.

---

## 🛠 Development Workflow

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Docker & Docker Compose** (for local PostgreSQL and Redis)

### 2. Fork and Clone
```bash
git clone https://github.com/crnjihia/studyroom-live.git
cd studyroom-live
git checkout -b feat/your-feature-name
```

### 3. Install Dependencies
StudyRoom Live uses npm workspaces:
```bash
npm install
```

### 4. Setup Environment
```bash
cp .env.example .env
docker compose up -d postgres redis
npm run prisma:generate
```

### 5. Start Development Servers
Run the Collab Server (Node.js + Hocuspocus + Socket.io):
```bash
npm run dev -w apps/collab-server
```

In a second terminal, run the Next.js Web App:
```bash
npm run dev -w apps/web
```

---

## 🧪 Testing Guidelines

Before opening a pull request, ensure all tests pass:

### Unit Tests (Vitest)
Verifies Yjs RelativePosition comment anchoring and snapshot deduplication:
```bash
npm test
```

### End-to-End Tests (Playwright)
Executes multi-context concurrent editing simulations:
```bash
npm run test:e2e
```

---

## 📝 Commit Conventions

I follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New features or user-facing enhancements
- `fix:` Bug fixes
- `docs:` Documentation updates
- `test:` Adding or refactoring tests
- `refactor:` Code restructuring without functional changes
- `chore:` Maintenance, dependency updates, and configuration

---

## 📬 Submitting a Pull Request

1. Ensure your branch is rebased on the latest `master` or `main`.
2. Fill out the pull request template completely.
3. Link any related issues (e.g., `Closes #42`).
4. Ensure CI tests pass.
