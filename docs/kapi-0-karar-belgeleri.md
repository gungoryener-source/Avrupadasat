# Kapı 0 karar belgeleri (taslak)

Durum: **TASLAK — avukat (Rechtsanwalt), Steuerberater ve gümrük müşaviri onayına sunulacak.** Bu belge hukuki veya vergisel görüş değildir; seçenekleri, dayanakları ve sorulacak soruları listeler. Tarih: 26.11.2026.

Kapı 0, ilk pilot müşterinin malı Almanya'ya girmeden önce kapanması gereken kararlardır. Kod tarafında her karar bir ayara veya bir onboarding adımına dönüşür (en altta).

---

## K0-1 · İthalatçı ve ürün sorumluluğu modeli

### Neden önce bu?

Malın AB'ye kimin adına girdiği; gümrük borcunu, ithalat KDV'sinin kimde indirileceğini, ürün güvenliği (GPSR), ambalaj (PPWR/VerpackDG) ve elektrikli ürün (ElektroG) yükümlülüklerinin kime düşeceğini belirler.

**Kritik dayanak:** Piyasa Gözetimi Yönetmeliği (AB) 2019/1020 Madde 4(2)(d): CE vb. uyumlaştırılmış mevzuata tabi bir ürün için AB'de yerleşik üretici, ithalatçı veya yetkili temsilci yoksa, **ürünü işleyen AB'de yerleşik fulfillment sağlayıcısı** Madde 4(3) görevlerinin (uygunluk beyanını hazır tutma, makamlarla işbirliği, risk bildirimi) sorumlusu olur. Müşterinin AB'de sorumlu tarafı olmaması riski doğrudan depoya (partner depoya veya bize) taşır.

Ek dayanaklar: ElektroG ve PPWR/VerpackDG'de pazaryerleri ve fulfillment sağlayıcıları, satıcının kaydını kontrol etmekle yükümlüdür; Almanya'da şubesi olmayan üretici yetkili temsilci (Bevollmächtigter) atamak zorundadır (ambalajda 12.08.2026'dan beri).

### Seçenekler

|                            | A) Müşterinin Alman şirketi ithalatçı        | B) Türk şirketi ithalatçı (Alman KDV kaydı + dolaylı temsilci) | C) Avrupadasat alıp satar              |
| -------------------------- | -------------------------------------------- | -------------------------------------------------------------- | -------------------------------------- |
| Gümrük beyanında ithalatçı | Müşterinin UG/GmbH'si                        | Türk şirketi; gümrük müşaviri dolaylı temsilci                 | Avrupadasat                            |
| İthalat KDV'si indirimi    | Müşteride                                    | Müşteride (Alman KDV kaydıyla)                                 | Avrupadasat'ta                         |
| GPSR/2019/1020 sorumlusu   | Müşterinin Alman şirketi (ithalatçı)         | Atanmış AB sorumlu kişi/yetkili temsilci şart                  | Avrupadasat                            |
| LUCID / stiftung ear       | Müşterinin şirketi                           | Yetkili temsilci şart                                          | Avrupadasat                            |
| Bizim risk                 | Düşük                                        | Orta (temsilci ve dolaylı temsilci müteselsil sorumluluğu)     | Yüksek (ürün, vergi, iade, stok riski) |
| Satışla uyum               | Paket modeline uygun (Başlangıç → Operasyon) | Hızlı başlangıç, pilot için uygun                              | İş modeline aykırı                     |

**Önerilen yön (karar ekibe ve avukata ait):** Varsayılan A; pilotlarda B'ye izin, ancak mal kabulden önce AB sorumlu kişi ve yetkili temsilci sözleşmeleri imzalanmış olmalı. C yapılmaz.

### Avukata ve müşavire sorular

1. B modelinde gümrük müşavirinin dolaylı temsilci olarak üstlendiği müteselsil sorumluluk (Birlik Gümrük Kodu Md. 18 ve 77(3)) için teminat/sözleşme şartları neler olmalı?
2. Partner depo 2019/1020 Md. 4 anlamında "fulfillment sağlayıcı" sayılırsa, Avrupadasat'ın (depoyu işletmeyen koordinatör) rolü nedir? Sorumluluk partner depoda mı kalır?
3. Müşterinin AB sorumlu kişisi yoksa mal kabulü reddetmek yeterli bir önlem mi; hangi belge (yazılı atama, uygunluk beyanı) mal kabulden önce istenmeli?
4. Yetkili temsilci (ambalaj, WEEE) hizmetini kendimiz mi veririz, yoksa lisanslı bir sağlayıcıya mı yönlendiririz? Kendimiz verirsek sorumluluk ve sigorta kapsamı?

---

## K0-2 · Sözleşme modeli

### Önerilen yapı (taslak)

1. **Çerçeve hizmet sözleşmesi (Rahmenvertrag):** taraflar, süre (aylık fesih, kurulum ücreti yok — fiyat politikası), uygulanacak hukuk ve yetkili mahkeme, ödeme ve gecikme, gizlilik.
2. **Hizmet tanımı (Leistungsbeschreibung):** paket kalemleri tek kaynaktan (`packages/core/src/pricing.ts`) üretilir; dahil olan / olmayan kalemler ayrı listelenir.
3. **Depolama ve lojistik şartları:** partner deponun ADSp 2017 şartlarını arka arkaya (back-to-back) yansıtma. ADSp 2017'de depolamada sorumluluk sınırı: kg başına 8,33 SDR, hasar başına en fazla 35.000 €, envanter farkı başına 70.000 €, hasar olayı başına 2,5 milyon €. Müşteriye bundan geniş sorumluluk verilmez; yüksek değerli mallar için mal sigortası müşteriye önerilir.
4. **SLA eki (K0-3).**
5. **Veri işleme sözleşmesi (AVV, DSGVO Md. 28):** müşteri adına son alıcı verisi (sipariş adresleri) işlendiği için zorunlu. Alt işleyenler: barındırma, e-posta, depo, kargo.
6. **Yetki ve vekâlet ekleri:** gümrük temsil yetkisi, pazaryeri hesap erişimi (API anahtarları yalnız şifreli saklanır), şirket kuruluşu vekâletnamesi (Türk noteri + apostil).

### Kararlar ve sorular

- Sözleşme dili: Almanca asıl + Türkçe tercüme mi, Türkçe asıl mı? Uyuşmazlıkta hangi metin geçerli?
- Uygulanacak hukuk: Alman hukuku (depo Almanya'da) önerilir. Yetkili mahkeme: Alman şirketimizin bulunduğu yer mi? (Alman şirketi kurulmadan bu karar verilemez → Açık karar.)
- Depocu rehin hakkı (HGB § 475b): ödenmeyen faturada stok üzerinde hapis hakkı; sözleşmede açıkça yazılmalı mı?
- Fesihte stok tahliyesi: süre (ör. 30 gün), bedel, tahliye edilmeyen stok.
- AGB olarak mı (standart koşullar) yoksa bireysel sözleşme olarak mı? AGB'de sorumluluk sınırlamalarının geçerliliği (BGB § 307 vd.) avukata sorulmalı.

---

## K0-3 · SLA (hizmet seviyesi) taslağı

Değerler **öneridir**; partner deponun kendi SLA'sından daha iyisi müşteriye verilmez.

| Ölçüt               | Öneri                                                        | Ölçüm (platformda)                 |
| ------------------- | ------------------------------------------------------------ | ---------------------------------- |
| Mal kabul süresi    | Depoya varıştan sonra 2 iş günü                              | Sevkiyat `receivedAt` − varış      |
| Sipariş kesim saati | İş günü 14:00'e kadar gelen sipariş aynı gün kargoda         | Sipariş `shippedAt` − `orderedAt`  |
| Sipariş doğruluğu   | ≥ %99,5 (yanlış ürün/adet)                                   | Hatalı gönderim kayıtları / toplam |
| Envanter doğruluğu  | ≥ %99,5; yıllık tam sayım + çeyreklik döngüsel sayım         | Sayım farkı / stok                 |
| İade işleme         | Varıştan sonra 3 iş günü içinde kontrol ve kayıt             | İade `processedAt`                 |
| Hasar ve kayıp      | ADSp sınırları içinde; bildirim 7 gün içinde                 | Hasar kaydı                        |
| Raporlama           | Panelde canlı stok; aylık fatura ve KTÜN (GTIN) bazlı rapor  | `/panel/stok/ktun`                 |
| Destek              | Türkçe, iş günü 09:00–18:00 (TR saati), ilk yanıt 4 iş saati | Mesaj kayıtları                    |

Sorular: SLA ihlalinde yaptırım (fatura indirimi mi, fesih hakkı mı)? Mücbir sebep, sezon zirveleri (Kasım–Aralık) istisnası?

---

## Koda yansıması (karar verilince)

- **K0-1:** onboarding'e "AB sorumlu taraf" adımı (ithalatçı modeli A/B, AB sorumlu kişi adı ve adresi, yetkili temsilci LUCID ve stiftung ear numaraları). Adım tamamlanmadan ASN (mal kabul bildirimi) oluşturulamaz. Bugün satış adımları vergi kayıtlarına kilitli; aynı mekanizma kullanılır.
- **K0-2:** teklif PDF'ine sözleşme sürümü ve AVV kabulü; audit kaydı.
- **K0-3:** panelde SLA göstergeleri (mal kabul süresi, aynı gün gönderim oranı, iade süresi). Veriler zaten tutuluyor.
