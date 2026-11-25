# Avrupadasat — Yazılım Geliştirme Planı

Son güncelleme: 24.11.2026

## Kararlar

| Konu         | Karar                                                                                                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Çalışma adı  | **Avrupadasat**. Marka adı kodda tek bir ayar dosyasında (`brand.config.ts`); değişirse tek yerden güncellenir                                                                                |
| Kapsam       | **Yalnızca TR hattı**: Türk üretici ve ihracatçılara Avrupa'da (Almanya merkezli) satış, taşıma, depo ve operasyon. Almanya'daki işletmelere dijital müşteri kazanımı hattı plandan çıkarıldı |
| Teknik temel | **Sıfırdan Next.js** (TypeScript). WordPress/Starter Kit kullanılmıyor                                                                                                                        |
| Repo         | **Yeni GitHub reposu**: önerilen ad `gungoryener-source/avrupadasat` (private)                                                                                                                |

## Mimari (özet)

```
apps/web        Next.js: Türkçe site (/), müşteri paneli (/panel), ekip paneli (/admin)
apps/worker     Arka plan işleri: e-posta, bildirim, rapor, API senkronları
packages/db     PostgreSQL + Prisma şema ve migration'lar
packages/core   İş kuralları, roller, olay şemaları (lead.submitted.v1 …)
packages/ui     Ortak tasarım bileşenleri
packages/i18n   Metinler (site Türkçe; Avrupalı son müşteriye giden içerikler ayrıca)
```

- **Veri:** Her kayıtta `tenantId` (müşteri firma); başka firmanın verisine erişim yok (izolasyon testleri zorunlu).
- **Kimlik:** E-posta + şifre, 2FA; roller: ADMIN, SALES, OPS, FINANCE, PARTNER, CLIENT_OWNER, CLIENT_USER.
- **Barındırma:** AB'de (DSGVO). Başlangıçta Vercel (Frankfurt) + yönetilen PostgreSQL (AB bölgesi).
- **Dış entegrasyonlar:** Hepsi adaptör + "mock" modu; API anahtarı olmadan demo verisiyle çalışır.

## Aşamalar

### Aşama 0 — Kurulum (1–2 gün)

- [ ] GitHub reposunun açılması (kullanıcı) ve bağlanması — kod yerelde hazır, repo bekleniyor
- [x] Monorepo iskeleti (pnpm + Turborepo), lint, format, test altyapısı, GitHub Actions
- [x] `CLAUDE.md`, `brand.config.ts`, `.env.example`
- [x] Veri modeli taslağı (ERD) ve olay kataloğu → `docs/architecture/`
- **Bitti sayılır:** `pnpm dev` ile boş site ve panel açılıyor, CI yeşil

### Aşama 1 — Çekirdek (1–2 hafta)

- [ ] Kimlik doğrulama, roller, çok kiracılı yapı + izolasyon testleri
- [ ] Firma/müşteri kartı, belgeler, yetkililer
- [ ] CRM: lead → ön değerlendirme → teklif → sözleşme → onboarding
- [ ] Teklif PDF'i ve çevrimiçi onay
- [ ] Ekip paneli iskeleti, audit log
- **Bitti sayılır:** Formdan gelen bir lead teklife, sözleşmeye ve aktif müşteriye dönüşebiliyor

### Aşama 2 — Türkçe site (2 hafta)

- [ ] Ana sayfa, hizmetler, 3 adımlı süreç, paketler (Başlangıç / Operasyon / Pazara Giriş), SSS
- [ ] **Ücretsiz Avrupa Uygunluk Raporu** (kanca ürün): form → 48 saatte rapor → teklif. Sitede en az 3 noktadan erişim
- [ ] "Ürünüm Avrupa'ya uygun mu?" sihirbazı (CE, GPSR, ambalaj, WEEE kontrol listesi)
- [ ] Maliyet hesaplayıcı: aylık operasyon + **kuruluş toplamı (noter, sicil, devlet harçları dahil tahmini)**
- [ ] **"Almanya'da şirket kuruluşu" hizmet sayfası** (sıfırdan, Türk ihracatçıya göre): UG/GmbH karşılaştırması, Türk noterinde vekâletname + apostil + çeviri adımları, Türkiye–Almanya çifte vergilendirme anlaşması ve kâr transferi örnekleri, dahil olan / olmayan kalemler
- [ ] Güven unsurları: ekip, iş ortağı avukat ve Steuerberater, gerçek vaka çalışmaları; WhatsApp ve Türkçe danışman CTA'ları
- [ ] Arama reklamları için tek hedefli açılış sayfası şablonu + A/B varyantı ("Amazon Almanya'da satış", "Almanya'da şirket kurmak", "Almanya'ya e-ihracat", "Almanya'da depo")
- [ ] Ön değerlendirme / rapor formu → CRM
- [ ] **Tek, tutarlı fiyat listesi** (palet/ay, mal kabul, kademeli pick & pack, Pre-FBA, iade); kurulum ücreti yok, aylık fesih; hesaplayıcı ile aynı `pricing` tablosundan beslenir
- [ ] **Uyum paketi** sayfası: Alman KDV kaydı, mali temsilci (Fiskalvertretung), LUCID/VerpackG, GPSR AB sorumlu kişi (resmî kaynaktan doğrulanmadan vaat yok)
- [ ] **İade merkezi** sayfası: kontrol, yeniden etiketleme, yeniden satış
- [ ] **"Paket mi, toplu ithalat mı?"** rehberi: 1 Temmuz 2026 paket başı 3 € vergisi, H7/A.TR belirsizliği dürüstçe
- [ ] **E-ihracat destek rehberi**: kaldırılan / süren destekler, ön onay şartı, "Destek uygunluk ön kontrolü" CTA'sı
- [ ] Pilot paket: "İlk 1–2 paletle Almanya'yı test edin"
- [ ] SEO içerik kümesi: şirket kurma maliyeti, gerekli evraklar, ne kadar sürer, depo fiyatları, gümrük vergisi hesaplama, Amazon Almanya'da nasıl satılır
- [ ] Çerez onayı + Google Consent Mode v2, GA4/GTM olayları; KVKK ve DSGVO metinleri
- **Bitti sayılır:** Site staging'de yayında, form CRM'e düşüyor

### Aşama 3 — Müşteri paneli (2–3 hafta)

- [ ] Genel bakış: ciro, sipariş, stok, uyarılar
- [ ] Sevkiyat kaydı ve adım adım takip (manuel giriş): fabrika → TR çıkış → AB giriş → gümrük → depo
- [ ] Belgeler: ticari fatura, A.TR, çeki listesi, CMR; eksik belge uyarısı
- [ ] Partner depoya gelen sevkiyat bildirimi (ASN), stok listesi (CSV içe aktarma)
- [ ] Şirket kurulum süreci takibi (GmbH/UG, vergi no, EORI, LUCID)
- [ ] **Bekleme yönetimi:** kayıtlar beklenirken panel açık; "bu arada hazırlayabilecekleriniz" listesi (ürün kartları, Almanca içerik onayı, ilk ASN), hatırlatmalar; yalnız satış ve ödeme adımları numara gelene kadar kilitli
- **Bitti sayılır:** İlk gerçek müşteriler panele girip kendi verisini görebiliyor

### Aşama 4 — Operasyon (pilot müşteriyle)

- [ ] Sipariş, fulfillment iş emri, iade ve hasar kaydı
- [ ] Maliyet yansıtma kuralları ve aylık müşteri faturası
- [ ] Amazon SP-API ve eBay bağlantıları (önce sandbox); Almanca web mağaza
- [ ] Partner performans skor kartı

### Aşama 5 — Otomasyon ve mobil

- [ ] AI destekli müşteri mesajı yanıtı (Almanca mesaj, Türkçe çeviriyle onay)
- [ ] Ürün içeriğinin Almancaya AI ile hazırlanması (insan onaylı)
- [ ] DATEV aktarımı, KDV/OSS raporu
- [ ] iOS / Android müşteri uygulaması (Expo / React Native, aynı API)

## Paket kurgusu (taslak, rakip analizinden)

| Paket        | İçerik                                                                           | Kurulum                  | Aylık                        |
| ------------ | -------------------------------------------------------------------------------- | ------------------------ | ---------------------------- |
| Başlangıç    | UG/GmbH kuruluşu, vekâletname ve apostil rehberliği, vergi kaydı                 | UG ~€1.250, GmbH ~€3.000 | —                            |
| Operasyon    | Başlangıç + sanal ofis + muhasebe + stok/sevkiyat yazılımı                       | Başlangıç ile aynı       | ~€349                        |
| Pazara Giriş | Operasyon + depo + gümrük takibi + Amazon/eBay DE + Almanca sayfalar + pazarlama | İndirimli                | €499'dan, depo ve hacme göre |

Strateji: kuruluşu rakibe yakın fiyatla verip asıl geliri aylık operasyon ve satıştan almak. Kaynak analizler: _rakip-company-formation-germany.md_, _rakip-qonto-einzelunternehmen.md_.

## Kod dışı paralel işler (kullanıcı tarafı)

- [ ] Marka adı kesinleştirme + TÜRKPATENT / DPMA / EUIPO sorgusu, alan adları
- [ ] Almanya'daki avukat, noter ve Steuerberater iş ortağı; kuruluş maliyetinin netleşmesi
- [ ] Gerçek noter ve sicil harç aralıkları (hesaplayıcı ve teklif şablonu için)
- [ ] Türk noterinde vekâletname + apostil sürecinin süre ve maliyetle doğrulanması
- [ ] Ticaret vergisi asgari çarpanının 2027'de %280'e çıkacağı bilgisinin resmî kaynaktan teyidi
- [ ] Partner depo, nakliyeci, gümrük temsilcisi görüşmeleri; fiyat listesindeki taslak rakamların (€13/palet, €2,10→1,60 pick, €4 iade) partner maliyetiyle teyidi
- [ ] Mali temsilci ve AB sorumlu kişi (GPSR) iş ortağı
- [ ] 13.04.2026 E-İhracat Genelgesi, 10881 sonrası 5986 sayılı Karar, YLDA (10962) okunması; Md. 15 oranı/tavanı, Almanya statüsü, onaylı sağlayıcı listesi için müşavir görüşü
- [ ] Stratejik hedef: Bakanlık onaylı fulfillment sağlayıcı listesine girmek (girmeden "Bakanlık onaylı" ifadesi kullanılmaz)
- [ ] GPSR, WEEE (stiftung ear), PPWR/VerpackG maddelerinin resmî kaynaktan doğrulanması; H7/A.TR durumu için gümrük müşaviri
- [ ] Google Keyword Planner + Ads Transparency Center + Meta Ad Library ile hacim ve rakip reklam kontrolü (tarayıcı gerekli)
- [ ] İlk 1–3 pilot üretici
- [ ] Kapı 0 karar belgeleri (ithalatçı sorumluluğu, sözleşme modeli, SLA …)

## Çalışma düzeni

- Her aşama ayrı branch (`phase-0-setup`, `phase-1-core` …), PR ile birleştirme
- Her aşama sonunda: ✅ yapılanlar · ⚠️ eksikler · ❓ karar bekleyenler · ▶️ sonraki adım
- Demo verisi canlıya çıkmaz; gerçek vaka ve yorumlar yalnızca izinle
