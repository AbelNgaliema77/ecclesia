FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/domain/package.json packages/domain/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgres://build:build@localhost:5432/build \
    BETTER_AUTH_SECRET=build-time-placeholder-not-used-at-runtime \
    BETTER_AUTH_URL=http://localhost:3000
RUN pnpm --filter @ecclesia/web build

FROM deps AS migrator
COPY . .
CMD ["pnpm", "--filter", "@ecclesia/db", "migrate"]

FROM node:22-alpine AS web
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S ecclesia && adduser -S ecclesia -G ecclesia
COPY --from=build --chown=ecclesia:ecclesia /app/apps/web/.next/standalone ./
COPY --from=build --chown=ecclesia:ecclesia /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=ecclesia:ecclesia /app/apps/web/public ./apps/web/public
USER ecclesia
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "apps/web/server.js"]
