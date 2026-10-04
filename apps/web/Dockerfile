# ==============================================================================
# Multi-Stage Dockerfile for Draftroom Live Next.js Web App
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependencies (deps)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS deps
# libc6-compat provides compatibility for certain native packages on Alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root monorepo manifest and package manifests for workspace resolution
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/shared/package.json ./apps/shared/
COPY apps/collab-server/package.json ./apps/collab-server/

# Install all dependencies matching the lockfile
RUN npm ci

# ------------------------------------------------------------------------------
# Stage 2: Builder
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy full repository source code
COPY . .

# Generate Prisma Client for PostgreSQL schema
RUN npm run prisma:generate

# Build the shared TypeScript library
RUN npm run build -w apps/shared

# Accept public environment variables as build arguments (baked in at build time)
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ARG NEXT_PUBLIC_COLLAB_SERVER_URL="http://localhost:4000"
ARG NEXT_PUBLIC_COLLAB_WS_URL="ws://localhost:4000"

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_COLLAB_SERVER_URL=$NEXT_PUBLIC_COLLAB_SERVER_URL
ENV NEXT_PUBLIC_COLLAB_WS_URL=$NEXT_PUBLIC_COLLAB_WS_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Ensure public directory exists even if the source repository has no static assets
RUN mkdir -p /app/apps/web/public

# Build the Next.js application with output: 'standalone'
RUN npm run build -w apps/web

# ------------------------------------------------------------------------------
# Stage 3: Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a non-root system user and group for security compliance
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and public directory
COPY --from=builder /app/apps/web/public ./apps/web/public

# Set correct ownership for prerendered cache and runtime assets
RUN mkdir -p ./apps/web/.next && chown -R nextjs:nodejs ./apps/web/.next

# Copy standalone output and static files produced by Next.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Switch to the non-root user
USER nextjs

# Expose Next.js HTTP server port
EXPOSE 3000

# Start the Next.js standalone Node server
CMD ["node", "apps/web/server.js"]
