# İşletim kılavuzu

## Dağıtım (önerilen)

| Bileşen              | Öneri                                                                 | Not                                             |
| -------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| Web (apps/web)       | Vercel (Frankfurt, `fra1`) veya AB'de Node 22 konteyneri              | `pnpm --filter @avrupadasat/web build && start` |
| Worker (apps/worker) | Tek küçük konteyner (Fly.io `fra`, Hetzner, Render EU)                | Birden fazla kopya güvenli (SKIP LOCKED)        |
| PostgreSQL 16        | Yönetilen, AB bölgesi (Neon EU, Supabase Frankfurt, RDS eu-central-1) | Günlük şifreli yedek + PITR                     |
| Belge depolama       | S3 uyumlu AB bölgesi (`storage.ts` adaptörünü değiştirin)             | Yerel disk yalnız tek sunuculu kurulumda        |
| ClamAV               | `clamav/clamav` konteyneri, `CLAMAV_HOST`                             | Yoksa belgeler "Taranmadı" işaretlenir          |

Dağıtım sırası: `pnpm --filter @avrupadasat/db migrate:deploy` → web → worker.

## Ortam değişkenleri

Tam liste: `.env.example`. Üretimde eksik/zayıf `AUTH_SECRET`, `FIELD_ENCRYPTION_KEY`, `DATABASE_URL` veya https olmayan `NEXT_PUBLIC_SITE_URL` ile web sunucusu başlamaz.

- `FIELD_ENCRYPTION_KEY` kaybolursa vergi no, IBAN, TOTP sırları ve alıcı adresleri okunamaz. Anahtarı secret manager'da yedekli tutun.
- Anahtar rotasyonu (yapılacak): `v1.` önekli biçim sürümlü; yeni anahtar `v2` ile eklenip arka planda yeniden şifreleme yapılacak.

## Zamanlanmış işler

Worker, `NEXT_PUBLIC_SITE_URL` ve `CRON_SECRET` tanımlıysa şunları çağırır:

| İş                                      | Sıklık | Uç nokta                  |
| --------------------------------------- | ------ | ------------------------- |
| Pazaryeri sipariş senkronu              | 15 dk  | `POST /api/cron/sync`     |
| Depo palet anlık görüntüsü (faturalama) | Günlük | `POST /api/cron/snapshot` |

Platform cron'u da kullanılabilir (`Authorization: Bearer $CRON_SECRET`).

## Aylık faturalama

1. Ayın ilk günlerinde **Ekip paneli → Faturalar → Taslakları oluştur** (dönem: önceki ay).
2. Masraf yansıtmaları (noter, kargo) dönem kapanmadan eklenir.
3. Taslakları kontrol edip **Kes** → numara verilir, değiştirilemez; müşteri panelinde görünür.
4. **Muhasebe dışa aktarımı → DATEV CSV** vergi danışmanına gönderilir.

## Güvenlik kontrol listesi (son durum)

| Kontrol                                                                                  | Durum                                  |
| ---------------------------------------------------------------------------------------- | -------------------------------------- |
| Güvenlik başlıkları (CSP, HSTS, XFO, nosniff, Referrer, Permissions, COOP)               | ✅ e2e'de doğrulandı                   |
| Token sayfalarında `Referrer-Policy: no-referrer`, `no-store`                            | ✅                                     |
| Onaysız durumda hiçbir ölçüm isteği gitmiyor                                             | ✅ e2e (ret, kısmi onay, tam onay)     |
| Tenant izolasyonu (veritabanı, sayfalar, indirme, mobil API)                             | ✅ birim + e2e                         |
| Argon2id, 2FA (zorunlu roller), TOTP tekrar kullanım engeli, kilitleme, hız sınırı       | ✅                                     |
| Dosya: içerik tespiti, boyut sınırı, tarama, public dışı depolama, imzalı süreli indirme | ✅                                     |
| Gizli anahtarlar repoda yok; CI'da gitleaks                                              | ✅                                     |
| Bağımlılık açığı (`pnpm audit --prod`)                                                   | ✅ (effect override)                   |
| securityheaders.com / Lighthouse                                                         | ⏳ Yayına alınınca (genel URL gerekir) |
| Tag Assistant / Meta Events Manager                                                      | ⏳ Gerçek GTM ve Pixel kimlikleriyle   |
| Sızma testi                                                                              | ⏳ Yayın öncesi bağımsız test önerilir |

## Bilinen sınırlar / sonraki işler

- Canlı Amazon SP-API ve eBay bağlantısı: adaptör arayüzü hazır; kimlik bilgileri ve sandbox doğrulaması gerekiyor.
- E-posta gönderimi: worker'daki `sendLinkEmail` mock; SMTP/Postmark/SES adaptörü eklenecek.
- CSP'de `'unsafe-inline'` script: nonce tabanlı CSP'ye geçiş (GTM ile birlikte) yapılacak.
- Fatura KDV modeli (`vatRatePct`) ve DATEV hesap eşlemesi vergi danışmanıyla doğrulanacak.
- Mobil uygulama mağaza yayını: EAS build, uygulama simgeleri, gizlilik etiketleri.
- Hukuki metinler taslak; avukat onayı gerekiyor.
