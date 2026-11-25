# Avrupadasat

Türk üretici ve ihracatçılar için Almanya merkezli Avrupa satış platformu: Türkçe site, müşteri paneli, ekip/partner paneli, arka plan işleyici ve mobil uygulama.

- Ürün ve geliştirme kuralları: [`CLAUDE.md`](CLAUDE.md)
- Plan ve durum: [`docs/PLAN.md`](docs/PLAN.md)
- İşletim kılavuzu (dağıtım, ortam, yedek, güvenlik): [`docs/RUNBOOK.md`](docs/RUNBOOK.md)
- Mimari: [`docs/architecture/`](docs/architecture)

## Yapı

```
apps/web        Next.js 16 — site (/), müşteri paneli (/panel), ekip/partner paneli (/admin), mobil API (/api/v1)
apps/worker     Outbox olay işleyici + zamanlanmış işler (sipariş senkronu, depo anlık görüntüsü)
apps/mobile     Expo (React Native) müşteri uygulaması
packages/core   Marka ayarı, roller (RBAC), olay şemaları, tek kaynaklı fiyat ve fatura hesabı
packages/db     Prisma 7 şema ve migration'lar, tenant izolasyonu, alan şifreleme, seed
packages/ui     Ortak bileşenler ve tasarım belirteçleri
e2e/            Uçtan uca tarayıcı testleri (playwright-core + Chrome)
```

## Kurulum

```bash
corepack enable
pnpm install
cp .env.example .env            # zorunlu alanları doldurun (AUTH_SECRET, FIELD_ENCRYPTION_KEY, CRON_SECRET)
cp .env apps/web/.env && cp .env packages/db/.env && cp .env apps/worker/.env
pnpm db:up                      # yerel PostgreSQL (Docker)
pnpm db:migrate                 # şema + Prisma istemcisi
pnpm db:seed                    # demo verisi (yalnız yerel): admin@avrupadasat.local / musteri@yildiz.local, şifre SEED_PASSWORD
pnpm dev                        # http://localhost:3000 (+ worker)
```

İlk girişte ekip ve firma sahibi hesapları 2FA kurmaya yönlendirilir (Google/Microsoft Authenticator).

Mobil uygulama: `cd apps/mobile && pnpm start` (Expo). API adresi `app.json → extra.apiUrl`.

## Kontroller

```bash
pnpm lint && pnpm typecheck && pnpm test     # birim + entegrasyon (DATABASE_URL varsa izolasyon testleri dahil)
pnpm build

# Uçtan uca (sunucu çalışırken; Aşama 2 çerez testi için test GTM/Meta kimlikleriyle derleyin)
GTM_ID=GTM-TEST123 META_PIXEL_ID=1234567890 pnpm --filter @avrupadasat/web build
NEXT_PUBLIC_SITE_URL=http://localhost:3100 GTM_ID=GTM-TEST123 META_PIXEL_ID=1234567890 pnpm --filter @avrupadasat/web start -p 3100 &
pnpm e2e
```

| Katman                  | Kapsam                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Birim/entegrasyon (142) | Derin sağlık kontrolü, Hesap silme (web + mobil API), eBay ve Shopify adaptörleri, webhook imzası, anlık bildirim, SMTP gönderimi, anahtar rotasyonu, S3 depolama, nonce CSP, Amazon SP-API (sahte sunucu), ciro KPI, fiyat ve fatura hesabı, RBAC, olay şemaları, TOTP (RFC vektörleri), Argon2, oturum, kilitleme, tenant izolasyonu, şifreleme, CSV, dosya türü tespiti, imzalı bağlantılar, sipariş/rezervasyon, iade, fatura, mobil API, yapay zekâ girdi güvenliği |
| Uçtan uca (50 adım)     | Aşama 1 talep→teklif→onay→davet→panel · Aşama 2 nonce CSP, SEO, çerez onayı, araçlar · Aşama 3 ASN, belgeler, mal kabul, partner kapsamı · Aşama 4 sipariş, kargo, iade, fatura, web mağaza · Aşama 5 içerik, mesajlar, mobil API, DATEV                                                                                                                                                                                                                                 |

## Demo (mock) modları

Anahtar girilmeyen tüm dış servisler açıkça işaretli demo modunda çalışır: e-posta (`SMTP_URL` yoksa konsola yazılır), Amazon/eBay/Shopify (örnek siparişler; canlı adaptörler `INTEGRATIONS_MODE=live`, sandbox `INTEGRATIONS_SANDBOX=1` ile), anlık bildirim (loglanır), Turnstile, Meta CAPI, ClamAV, yapay zekâ (`[Demo]` etiketli metin — onaylanamaz).
