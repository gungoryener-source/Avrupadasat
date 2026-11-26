#!/usr/bin/env bash
# Vercel derlemesi (Root Directory: apps/web). Ayrıntı: docs/VERCEL-DEMO.md
set -euo pipefail
cd "$(dirname "$0")/../../.."
# Neon/Vercel Postgres bağlantı havuzu dışındaki doğrudan adres geçişler için daha güvenli
DIRECT_URL="${DATABASE_URL_UNPOOLED:-${POSTGRES_URL_NON_POOLING:-$DATABASE_URL}}"

pnpm --filter @avrupadasat/db exec prisma generate
if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  DATABASE_URL="$DIRECT_URL" pnpm --filter @avrupadasat/db exec prisma migrate deploy
fi
if [ "${DEMO_ENVIRONMENT:-0}" = "1" ] && [ "${DEMO_SEED:-0}" = "1" ]; then
  DATABASE_URL="$DIRECT_URL" pnpm --filter @avrupadasat/db exec tsx ../../apps/web/scripts/demo-data.ts
fi
pnpm --filter @avrupadasat/web build
