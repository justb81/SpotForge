# Backend-Container. Zugleich die Build-Quelle für Coolify:
#   Base-Directory   = /            (Repo-Wurzel als Build-Context, wegen Monorepo)
#   Dockerfile-Pfad  = apps/backend/Dockerfile
#
# Mehrstufig: install → build (tsup-Bundle) → schlankes Runtime-Image.
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

# --- Install: nur Manifeste kopieren (Layer-Cache), dann gefiltert installieren ---
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/game-core/package.json ./packages/game-core/
COPY packages/ai-engine/package.json ./packages/ai-engine/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/app-config/package.json ./packages/app-config/
COPY packages/app-shell/package.json ./packages/app-shell/
COPY packages/ui/package.json ./packages/ui/
COPY apps/backend/package.json ./apps/backend/
COPY apps/mobile/package.json ./apps/mobile/
# Nur Backend + dessen Abhängigkeiten installieren (keine Mobile-/RN-Pakete).
RUN pnpm install --filter "@spotforge/backend..." --frozen-lockfile

# --- Build: Quellcode dazu, bündeln, dann self-contained Deploy erzeugen ---
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend
RUN pnpm --filter "@spotforge/backend" build
RUN pnpm --filter "@spotforge/backend" deploy --prod /prod/backend

# --- Runtime: minimal, non-root ---
FROM node:20-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build /prod/backend ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" || exit 1
CMD ["node", "dist/index.js"]
