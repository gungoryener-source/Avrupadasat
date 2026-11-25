# Avrupadasat

Türk üretici ve ihracatçılar için Almanya merkezli Avrupa satış platformu: site, müşteri paneli, ekip paneli.

- Ürün ve geliştirme kuralları: [`CLAUDE.md`](CLAUDE.md)
- Plan ve aşamalar: [`docs/PLAN.md`](docs/PLAN.md)
- Mimari: [`docs/architecture/`](docs/architecture)

## Yapı

```
apps/web        Next.js 16: site (/), müşteri paneli (/panel), ekip paneli (/admin)
apps/worker     Outbox olay işleyici (e-posta, bildirim, senkron)
packages/core   Marka ayarı, roller, olay şemaları, tek kaynaklı fiyat
packages/db     Prisma 7 şema, migration, tenant izolasyonu, alan şifreleme
packages/ui     Ortak bileşenler ve tasarım belirteçleri
```

## Kurulum

```bash
corepack enable
pnpm install
cp .env.example .env          # değerleri doldurun
cp .env packages/db/.env
pnpm db:up                    # yerel PostgreSQL (Docker)
pnpm db:migrate               # şema
pnpm db:seed                  # demo verisi (yalnız yerel)
pnpm dev                      # http://localhost:3000
```

## Kontroller

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Tenant izolasyon testleri `DATABASE_URL` tanımlıyken çalışır; CI'da her zaman çalışır.
