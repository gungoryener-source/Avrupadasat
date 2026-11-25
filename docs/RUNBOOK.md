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
| Güvenlik başlıkları (nonce CSP, HSTS, XFO, nosniff, Referrer, Permissions, COOP)         | ✅ e2e'de doğrulandı                   |
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

## E-posta (SMTP)

- `SMTP_URL` (ör. `smtps://kullanici:sifre@smtp.saglayici.de:465`), `MAIL_FROM`, `OPS_EMAIL` (virgülle birden fazla).
- `SMTP_URL` yoksa worker e-postaları yalnızca loglar (`[mock:email]`); üretimde `INTEGRATIONS_MODE=live` iken SMTP yoksa gönderim hata verir ve olay yeniden denenir.
- Üretim loglarında alıcı maskelenir, bağlantı (token) yazılmaz. Ekip bildirimleri kişisel veri içermez.

## Şifreleme anahtarı rotasyonu

1. Yeni anahtar üret: `openssl rand -base64 32`.
2. `FIELD_ENCRYPTION_KEYS="2:<yeni>,1:<eski>"` yap (ilk giriş aktif anahtar); web ve worker'ı yeniden başlat. Yeni yazılanlar v2 ile şifrelenir, eskiler okunmaya devam eder.
3. `pnpm db:rotate-keys` ile mevcut kayıtları v2'ye çevir (toplu, tekrar çalıştırılabilir; çıktı tablo bazında sayıları verir).
4. Çıktı 0 kalan gösterince eski anahtarı listeden çıkar ve yeniden başlat. Eski anahtarı bir süre kasada (secret manager) sakla.

## Belge depolama (S3 uyumlu)

- `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_REGION`, isteğe bağlı `S3_ENDPOINT` (Hetzner/MinIO/IONOS için; path-style), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
- Bucket herkese kapalı olmalı (Block Public Access); nesneler `AES256` sunucu tarafı şifrelemeyle ve üzerine yazmadan (`If-None-Match`) yüklenir. İndirme yine uygulamanın imzalı, süreli bağlantısı üzerinden yapılır.
- AB veri yerleşimi için bölge Frankfurt (eu-central-1) veya AB'deki bir sağlayıcı seçilmeli.

## CSP (nonce)

- `src/proxy.ts` her sayfa isteğinde yeni nonce üretir; `script-src` yalnız `'self'`, nonce ve yapılandırılmış GTM/Meta/Turnstile alan adları. API ve statik yollarda `default-src 'none'`.
- Bu nedenle sayfalar istek başına render edilir (statik önbellek yok). CDN önünde HTML önbelleği kapatılmalı.
- GTM'den eklenen özel HTML etiketleri nonce almaz ve CSP tarafından engellenir; etiketler GTM şablonlarıyla eklenmeli.

## Amazon SP-API (canlı)

1. Seller Central'da geliştirici kaydı; uygulama (private) oluştur; roller: Orders, Inventory and Order Tracking, Product Listing, ve adres için Restricted (Direct-to-Consumer Shipping).
2. `AMAZON_SP_API_CLIENT_ID`, `AMAZON_SP_API_CLIENT_SECRET` ortam değişkenlerini tanımla, `INTEGRATIONS_MODE=live`.
3. Firma adına yetkilendirme sonrası refresh token (`Atzr|…`) ve Seller ID ekip panelinden girilir (`connectAmazonLive`); kimlik bilgileri şifreli saklanır.
4. Yalnız FBM (MFN) siparişler içe aktarılır; FBA siparişleri atlanır. Kargo onayı kalem kimlikleriyle Amazon'a gönderilir; başarısız olursa audit'e düşer, ekip elle tekrarlar.
5. Canlıya almadan önce sandbox uç noktasıyla (`sandbox.sellingpartnerapi-eu.amazon.com`) bir tur deneme yapılmalı — adaptör sahte sunucuyla test edildi, gerçek hesapla henüz doğrulanmadı.

## Bilinen sınırlar / sonraki işler

- Amazon SP-API: kod hazır; gerçek hesap ve sandbox ile doğrulama gerekiyor. eBay canlı adaptörü henüz yok (demo).
- Fatura KDV modeli (`vatRatePct`) ve DATEV hesap eşlemesi vergi danışmanıyla doğrulanacak.
- Ürüne özel Almanca web mağaza.
- Mobil uygulama mağaza yayını: EAS build, uygulama simgeleri, gizlilik etiketleri, push bildirimleri.
- Hukuki metinler taslak; avukat onayı gerekiyor.
