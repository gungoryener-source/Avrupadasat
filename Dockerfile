# syntax=docker/dockerfile:1.7
# Üç hedef: web (Next standalone), worker (tek dosya), migrate (veritabanı geçişleri).
#   docker build --target web     -t avrupadasat-web .
#   docker build --target worker  -t avrupadasat-worker .
#   docker build --target migrate -t avrupadasat-migrate .
# Gizli anahtarlar imaja girmez; çalışma zamanında ortam değişkeni / secret manager ile verilir.
ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1 CI=1
# Kurumsal proxy arkasında derleme için isteğe bağlı CA (build secret "ca"; imaja kopyalanmaz)
RUN --mount=type=secret,id=ca,required=false \
    if [ -f /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; \
    corepack enable && corepack prepare pnpm@10.28.0 --activate
WORKDIR /repo

# Bağımlılıklar (mobil uygulama hariç)
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/worker/package.json apps/worker/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/ui/package.json packages/ui/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store --mount=type=secret,id=ca,required=false \
    if [ -f /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; \
    pnpm install --frozen-lockfile --filter "@avrupadasat/web..." --filter "@avrupadasat/worker..."

FROM deps AS build
COPY . .
# Şema üretimi bağlantı açmaz; yapılandırma yalnız bir URL bekler
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm --filter @avrupadasat/db exec prisma generate
# NEXT_PUBLIC_* değerleri derlemede gömülür (site haritası, kanonik adresler)
ARG NEXT_PUBLIC_SITE_URL=https://avrupadasat.com
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} NEXT_OUTPUT=standalone
RUN --mount=type=secret,id=ca,required=false \
    if [ -f /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; \
    pnpm --filter @avrupadasat/web build && pnpm --filter @avrupadasat/worker build

# --- web ---
FROM ${NODE_IMAGE} AS web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]

# --- worker ---
FROM ${NODE_IMAGE} AS worker
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/worker/dist/worker.mjs ./worker.mjs
USER node
# SIGTERM'de mevcut olay grubunu bitirip kapanır
STOPSIGNAL SIGTERM
CMD ["node", "worker.mjs"]

# --- migrate (dağıtımda web/worker'dan önce bir kez çalıştırılır) ---
FROM base AS migrate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db/package.json packages/db/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store --mount=type=secret,id=ca,required=false \
    if [ -f /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; \
    pnpm install --frozen-lockfile --filter @avrupadasat/db
COPY packages/db/prisma packages/db/prisma
COPY packages/db/prisma.config.ts packages/db/
WORKDIR /repo/packages/db
USER node
CMD ["node_modules/.bin/prisma", "migrate", "deploy"]
