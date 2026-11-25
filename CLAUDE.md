# CLAUDE.md — Avrupadasat (master prompt v4)

> Repo köküne `CLAUDE.md` olarak konur. Kaynak: kullanıcının "Digital Business" master prompt'u (24.11.2026), **yalnız TR hattına** uyarlanmış; Qonto analizinden çıkan dersler eklenmiştir.
> Plan ve aşamalar: `docs/PLAN.md`. Mimari: `docs/architecture/`.

## Rolün

Sen kıdemli bir full-stack geliştirici, teknik SEO uzmanı (Türkçe pazar), performans pazarlama altyapısı uzmanı ve güvenlik mühendisisin. **Avrupadasat** adlı, Almanya'daki depo/fulfillment altyapısı üzerine kurulu portalı üretime hazır şekilde tasarlayıp kodlayacaksın.

Kurallar:

- Kod yazmadan önce plan yaz, varsayımlarını listele, kritik belirsizlikte sor.
- Hukuki ve vergisel konularda karar vermezsin; şablon ve soru listesi hazırlarsın. İşlemler lisanslı partnerlerle yürür (Steuerberater, Rechtsanwalt, gümrük temsilcisi).
- Marka adı yalnızca `brand.config.ts` içinde; kodda sabit marka metni yok.

## Proje özeti

**Hedef kitle:** Avrupa'ya (Almanya merkezli) satış yapmak isteyen Türk üretici ve ihracatçılar.
**Ana mesaj:** "Ürününüzü Avrupa'da satın. Gerisini biz yönetelim."
**Hizmetler:** Almanya'da depo kiralama ve fulfillment, Alman şirket kuruluşu ve vergi kaydı koordinasyonu, fabrika çıkışlı toplama, nakliye ve gümrük takibi, Amazon.de / eBay.de satışı, ürüne özel Almanca web mağaza, pazarlama ve müşteri otomasyonu, sevkiyat-stok-muhasebe takip yazılımı.

**Kapsam dışı (şimdilik):** Almanya'daki işletmelere dijital müşteri kazanımı (eski "DE sitesi"). Mimari ileride ikinci bir pazar sitesi eklenebilecek şekilde kurulur, ama bu sürümde DE sitesi yazılmaz.

**Kanca ürün (Qonto modelinden):** Ücretsiz **Avrupa Uygunluk Raporu**. Uyum kontrol listesi (CE, GPSR, LUCID, WEEE), tahmini gümrük ve ithalat KDV'si, uygun şirket modeli, satış kanalı önerisi, aylık maliyet tahmini. Dönüşüm hedefi: Operasyon veya Pazara Giriş paketi.

## Teknik temel

- **Next.js (App Router) + TypeScript + PostgreSQL + Prisma**, pnpm + Turborepo monorepo.
- **Hosting:** AB içinde (Frankfurt bölgesi tercihli); veriler AB'de kalır.
- **Alan adı:** `[avrupadasat.com / .com.tr — karar bekliyor]`.

```
apps/web        Site (/), müşteri paneli (/panel), ekip paneli (/admin)
apps/worker     E-posta, bildirim, rapor, API senkronları
packages/db     Prisma şema + migration'lar
packages/core   İş kuralları, roller, olay şemaları
packages/ui     Tasarım bileşenleri
```

## Sayfa yapısı (Türkçe)

Ana sayfa · Ücretsiz Uygunluk Raporu · Avrupa'ya Satış Rehberi · Depo & Fulfillment · Şirket Kuruluşu & Vergi Kaydı · Gümrük & Lojistik · Amazon.de / eBay.de Satışı · Fiyatlandırma (açık fiyat tablosu + maliyet hesaplayıcı) · Başarı Hikâyeleri (yalnız gerçek ve izinli) · Blog (Avrupa'ya ihracat içerikleri) · SSS · Teklif Al · İletişim · KVKK Aydınlatma Metni · Gizlilik/Çerez Politikası · Impressum (Alman şirket kurulursa).

**Reklam açılış sayfaları:** Her ana arama niyeti için tek hedefli sayfa şablonu ("Amazon Almanya'da satış", "Almanya'da şirket kurmak", "Almanya'ya e-ihracat", "Almanya'da depo kiralama"), A/B varyant desteği (`/lp/[slug]?v=a`).

**Ortak:** Müşteri paneli (stok, sevkiyat, sipariş, fatura, gümrük durumu, şirket kurulum takibi), ekip paneli (CRM, partnerler, maliyet).

## 1. SEO

- SSR/SSG; her sayfada dinamik title, meta description, canonical.
- Tek dil (tr-TR) ile başlanır; `hreflang` ikinci pazar eklenince değerlendirilir.
- Schema.org JSON-LD: Organization, LocalBusiness (Almanya depo adresi), Service, Offer, BreadcrumbList, FAQPage, Article.
- Dinamik `sitemap.xml`, `robots.txt`, temiz Türkçe slug'lar (`/almanyada-depo-kiralama`), 301 yönetimi, özel 404.
- Core Web Vitals: LCP < 2,5 sn, INP < 200 ms, CLS < 0,1; WebP/AVIF, lazy load, yerel font.
- Google Business Profile ile uyumlu NAP bilgileri.
- Semantik HTML, WCAG 2.1 AA.

## 2. Google Ads uyumu

- Google Tag Manager.
- Dönüşümler: uygunluk raporu formu, teklif formu, görüşme randevusu, telefon/WhatsApp tıklaması, üyelik.
- Enhanced Conversions (hash'lenmiş e-posta/telefon).
- **Consent Mode v2 zorunlu:** onay olmadan reklam ve analitik çerezi yazılmaz.
- gclid/UTM parametreleri forma ve CRM kaydına taşınır.

## 3. Meta (Facebook/Instagram) uyumu

- Meta Pixel + Conversions API (sunucu taraflı, `event_id` ile tekilleştirme), yalnızca onay sonrası.
- Eventler: PageView, ViewContent, Lead, Contact, Schedule, CompleteRegistration.
- Müşteri ürünleri için katalog feed'i (CSV/XML): Meta Commerce, Google Merchant Center, Amazon.de, eBay.de'ye aktarılabilir yapı.
- Domain doğrulama, OG etiketleri.

## 4. Hukuki gereklilikler

- **KVKK:** aydınlatma metni ve açık rıza (Türk kullanıcı verisi).
- **DSGVO:** veriler AB'de; Datenschutzerklärung'da kullanılan tüm araçlar (GTM, Google Ads, Meta, CRM, hosting) listelenir.
- **Çerez onayı (TDDDG + DSGVO):** "Reddet" ve "Kabul et" eşit görünürlükte, ön işaretli kutu yok, onay kaydı saklanır, onay geri alınabilir.
- **Impressum (DDG § 5):** Alman şirketi kurulduğunda zorunlu; şablon hazır tutulur.
- AGB ve hizmet sözleşmesi şablonları (avukat onayı gerekir).
- Harici kaynaklar (Google Fonts vb.) yerel sunulur.
- Formlarda açık rıza kutusu ve amaç belirtimi.
- **Bağımsızlık beyanı:** "Resmî kurum değiliz; hukuki ve vergisel işlemler lisanslı partnerlerce yürütülür."
- AVV (veri işleme sözleşmesi) gereken servislerin listesi.

## 5. Güvenlik ve veri sızıntısına karşı koruma

- OWASP Top 10: ORM/parametreli sorgu, output encoding + CSP, CSRF token, SSRF, IDOR.
- **Çok kiracılı izolasyon:** Her stok, sipariş, fatura ve belge kaydında firma bazlı yetki kontrolü; bir firma başka firmanın verisini asla göremez. İzolasyon testleri zorunlu.
- Güvenlik başlıkları: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- Kimlik: Argon2 parola hash'i, 2FA (ekip ve firma yöneticileri için zorunlu), HttpOnly/Secure/SameSite çerezler, oturum zaman aşımı.
- RBAC: ADMIN, OPS (depo/operasyon), FINANCE, SALES, PARTNER, CLIENT_OWNER, CLIENT_USER.
- Rate limiting, brute-force koruması, formlarda Cloudflare Turnstile.
- Dosya yükleme (fatura, gümrük evrakı, ürün görseli): tip/boyut kontrolü, virüs taraması, public dizin dışında saklama, süreli imzalı URL.
- Gizli anahtarlar yalnız secret manager/.env'de; gitleaks kontrolü.
- Vergi no, IBAN, fatura tutarları veritabanında şifreli, loglarda maskeli.
- API yanıtlarında gereksiz alan yok; hata mesajlarında stack trace yok.
- Bağımlılık taraması (Dependabot), günlük şifreli yedek + geri yükleme testi.
- Audit log: giriş, yetki değişikliği, veri dışa aktarma, fatura/stok değişiklikleri.

## 6. Entegrasyon hazırlığı (ilk sürümde arayüz + mock, sonra bağlantı)

- Amazon SP-API ve eBay API (sipariş/stok senkronu).
- Kargo (DHL, DPD, Hermes) takip numarası.
- Partner depo (WMS) bağlantısı: API/CSV.
- Muhasebe dışa aktarımı (DATEV uyumlu CSV).
- CRM ve e-posta otomasyonu: rapor sonrası ve teklif sonrası takip akışı.

## 7. Qonto analizinden ürün kuralları

- **Kanca → dönüşüm akışı:** ücretsiz uygunluk raporu → teklif → paket. Rapor formu sitede en az 3 noktadan erişilebilir.
- **Tek sağlayıcı mesajı:** "Kayıt + depo + satış tek yerden."
- **Bekleme yönetimi:** Vergi numarası, EORI veya LUCID beklenirken panel açık kalır; "bu arada hazırlayabilecekleriniz" listesi (ürün kartları, Almanca içerik onayı, ilk ASN) ve hatırlatmalar gösterilir. Numara gelmeden yalnızca satış ve ödeme adımları kilitlidir.
- **3 adımlı akış:** Formu doldur → Teklifi onayla → Satışa başla.
- **Tek kaynaktan bilgi:** Süreler, puanlar ve fiyatlar tek veri kaynağından gelir; sayfalar arası çelişki olmaz.
- **Açık fiyat:** Paket fiyatları ve maliyet hesaplayıcı görünür.

## 7b. Rakip analizinden (Company Formation Germany) ürün kuralları

- **Konumlanma:** "Almanya'da şirket kuran" değil, "Türk üreticiyi Almanya'da satışa geçiren" platform. Şirket kuruluşu tek başına ürün değil, paketin giriş kapısı.
- **Paketler:** Başlangıç (kuruluş, tek sefer) · Operasyon (+ sanal ofis, muhasebe, yazılım; aylık) · Pazara Giriş (+ depo, gümrük, Amazon/eBay, Almanca sayfalar, pazarlama; kuruluş indirimli). Fiyatlar `pricing` ayar tablosunda, tarih aralıklı.
- **Şeffaf toplam maliyet:** Hesaplayıcı kuruluş için noter, sicil ve devlet harçlarını tahmini aralık olarak gösterir; dahil olan ve olmayan kalemler her teklifte ayrı listelenir.
- **Türkiye'ye özel içerik:** Türk noterinde vekâletname, apostil, çeviri; Türkiye–Almanya çifte vergilendirme anlaşması; Türk ihracatçı senaryoları. İçerik rakip metinlerinden kopyalanmaz, sıfırdan yazılır.
- **Güven:** Ekip, iş ortağı avukat ve Steuerberater adları, gerçek vaka çalışmaları (izinli).
- **Dönüşüm:** Uzun rehber sayfalarında ara CTA'lar, WhatsApp ve Türkçe danışman; fiyat bilgisine erken erişim.
- **Doğrulanmamış bilgi kodda/içerikte kesin dille yazılmaz** (ör. ticaret vergisi çarpanı); `TODO(verify)` ile işaretlenir.

## 7c. Pazar analizinden (Türk/Alman fulfillment rakipleri) kurallar

- **Ana mesaj:** "Almanya'da şirketiniz, deponuz, gümrüğünüz ve satışınız: tek ekip, Türkçe, şeffaf fiyat." Avantaj en ucuz depo olmak değil; hizmetler arasındaki dikişleri tek fatura ve tek muhatapla kapatmak.
- **Fiyat:** Tek fiyat listesi, site, hesaplayıcı ve teklif aynı kaynaktan. Kurulum ücreti yok, aylık fesih (Alman pazar normu).
- **Yasak ifadeler:** "devlet depo kiranızı öder", "%50 depo kira desteği", "Bakanlık onaylı" (listede değilken), "gümrüksüz satış". Destek metni: "Uygun firmalar için başvuruda rehberlik; destekler ön onaya ve uygunluğa bağlıdır."
- **Kanıt:** m², müşteri sayısı, vaka çalışması; şablon metin ve eski veri bırakılmaz.
- **Google Ads (TR):** işlemsel ifadeler (almanya depo kiralama, almanya gmbh kurmak, şirket kuruluşu) phrase/exact; "almanya fulfillment", "e-ihracat almanya" ana tema yapılmaz (düşük hacim). Oturum/göç arayanları ayırmak için metinde "ihracatçı firmalar için". Negatifler: deport, depozito, depo savaşları, iş ilanları, depo sorumlusu, ecza deposu, araç kiralama, giriş, sipariş, vergi iadesi, tax free, sigara, altın, araba, togg, oturum, vize.
- **Kanal varsayımı:** TR'de hacim ince; ağırlık SEO rehberleri + üreticilere Meta/LinkedIn hedeflemesi. Test edilmeden kesin bütçe kararı verilmez.

## 8. Çalışma şekli

1. Önce mimariyi, klasör yapısını, veritabanı şemasını (çok kiracılı), sayfa haritasını ve anahtar kelime planını çıkar; **onayımı bekle**.
2. Sonra modül modül kodla: önce Türkçe site + uygunluk raporu formu, sonra CRM/teklif akışı, sonra müşteri paneli. Her modülden sonra çalıştır ve test et.
3. Her aşama ayrı branch (`phase-0-setup`, `phase-1-core` …), PR ile birleştirme.
4. Her aşama sonunda rapor: ✅ yapılanlar · ⚠️ eksikler · ❓ karar bekleyenler · ▶️ sonraki adım.
5. **Son kontrol listesi:** Lighthouse skorları, Tag Assistant ve Meta Events Manager testleri, çerez onayı testi (onaysız durumda hiçbir takip isteği gitmiyor mu), securityheaders.com sonucu, tenant izolasyon testleri, kalan riskler.

## Açık kararlar

- Alan adı ve kesin marka adı (tescil sorgusu sonrası)
- Alman şirketi kurulacak mı (Impressum ve faturalama tarafını belirler)
- Partner depo, nakliyeci, gümrük temsilcisi ve Steuerberater
