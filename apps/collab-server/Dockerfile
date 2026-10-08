# ==============================================================================
# Multi-Stage Dockerfile for StudyRoom Live Collab Server (Socket.io + Yjs)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Production Dependencies (deps)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root monorepo manifest and package manifests for workspace resolution
COPY package.json package-lock.json ./
COPY apps/collab-server/package.json ./apps/collab-server/
COPY apps/shared/package.json ./apps/shared/
COPY apps/web/package.json ./apps/web/

# Install dependencies including devDependencies needed for build
RUN npm ci

# ------------------------------------------------------------------------------
# Stage 2: Builder
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full repository source code
COPY . .

# Generate Prisma Client for PostgreSQL schema
RUN npm run prisma:generate

# Build the shared library first (required by collab-server)
RUN npm run build -w apps/shared

# Compile TypeScript into JavaScript (dist directory)
RUN npm run build -w apps/collab-server

# Prune devDependencies to keep the production runtime small
RUN npm prune --omit=dev

# ------------------------------------------------------------------------------
# Stage 3: Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Create a non-root system user and group for security compliance
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 collab

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy compiled shared package and collab-server artifacts
COPY --from=builder /app/apps/shared/dist ./apps/shared/dist
COPY --from=builder /app/apps/shared/package.json ./apps/shared/package.json
COPY --from=builder /app/apps/collab-server/dist ./apps/collab-server/dist
COPY --from=builder /app/apps/collab-server/package.json ./apps/collab-server/package.json

# Copy Prisma schema and generated client for persistence
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Change ownership of working directory to non-root user
RUN chown -R collab:nodejs /app

# Switch to the non-root user
USER collab

# Expose collaboration server WebSocket and Socket.io port
EXPOSE 4000

# Start the compiled collaboration server
CMD ["node", "apps/collab-server/dist/index.js"]
