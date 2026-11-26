import { formatEur, packages } from "@avrupadasat/core/pricing";
import type { ContentPage } from "./types";

const U = "2026-11-25";

/** SEO rehberleri (/rehber/[slug]) — bilgi amaçlı aramalar için */
export const guides: ContentPage[] = [
  {
    slug: "almanyada-sirket-kurma-maliyeti",
    title: "Almanya'da Şirket Kurma Maliyeti 2026: Kalem Kalem",
    description:
      "Almanya'da UG veya GmbH kurmak kaça mal olur? Sermaye, noter ve sicil masrafları, apostil ve tercüme, hizmet bedeli ve yıllık giderler kalem kalem.",
    kicker: "Rehber",
    h1: "Almanya'da şirket kurma maliyeti: kalem kalem",
    intro:
      "“Almanya'da şirket kurmak kaça mal olur?” sorusunun cevabı üç parçadan oluşur: şirket sermayesi, üçüncü taraf masrafları (noter, sicil, apostil, tercüme) ve hizmet bedeli. Sonra yıllık giderler gelir.",
    sections: [
      {
        h2: "1. Sermaye",
        paragraphs: [
          "UG için yasal asgari sermaye 1 €'dur; ancak bankalar ve tedarikçiler nezdinde güven için birkaç bin euro önerilir. GmbH için sermaye 25.000 €'dur ve kuruluşta en az 12.500 € yatırılmalıdır. Sermaye bir masraf değildir; şirketin işletme parasıdır.",
        ],
      },
      {
        h2: "2. Üçüncü taraf masrafları",
        bullets: [
          "Alman noteri ve ticaret sicili ücretleri: yasal tarifeye (GNotKG) göre sermayeye ve sözleşme türüne bağlıdır. IHK tablosuna göre tek ortaklı, 25.000 € sermayeli GmbH'de yaklaşık 550 € (örnek tutanak) ile 730 € (bireysel sözleşme) arası, notere %19 KDV hariç",
          "Türk noterinde vekâletname (2026 tarifesiyle yaklaşık 1.500–2.500 TL), apostil şerhi (kaymakamlık veya valilikte ücretsiz) ve yeminli Almanca tercüme",
          "Gerekirse banka hesabı açılış belgeleri",
        ],
        paragraphs: [
          "Bu kalemler faturalarıyla birebir yansıtılır. Fiyatlar sayfasındaki hesaplayıcı tahmini aralığı gösterir.",
        ],
      },
      {
        h2: "3. Hizmet bedeli",
        paragraphs: [
          `Kuruluş koordinasyonu hizmet bedelimiz UG için ${formatEur(packages.BASLANGIC.oneTime.UG)}, GmbH için ${formatEur(packages.BASLANGIC.oneTime.GMBH)} tutarından başlar. Pazara Giriş paketinde kuruluş bedeli indirimlidir.`,
        ],
      },
      {
        h2: "4. Yıllık giderler",
        bullets: [
          "Muhasebe ve yıllık bilanço (vergi danışmanı)",
          "İş adresi / sanal ofis",
          "Ticaret odası (IHK) aidatı",
          "KDV beyanları ve gerekiyorsa mali temsilci",
        ],
      },
    ],
    cta: {
      title: "Size özel maliyet tablosu",
      text: "Ücretsiz uygunluk raporunda kuruluş ve ilk yıl giderlerini ürününüze ve hacminize göre çıkarıyoruz.",
    },
    schema: "Article",
    verify: ["Partner noterin yazılı teklifi", "IHK aidatı"],
    updated: U,
  },
  {
    slug: "almanyaya-ihracat-icin-gerekli-belgeler",
    title: "Almanya'ya İhracat İçin Gerekli Belgeler (2026 Kontrol Listesi)",
    description:
      "Türkiye'den Almanya'ya ihracatta gereken belgeler: ticari fatura, çeki listesi, A.TR, CMR, CE uygunluk beyanı, etiketleme ve ambalaj kaydı. Kontrol listesi.",
    kicker: "Rehber",
    h1: "Almanya'ya ihracat için gerekli belgeler",
    intro:
      "Sevkiyatın gümrükte beklememesi ve ürünün pazaryerinde kaldırılmaması için belgeler iki gruba ayrılır: sevkiyat belgeleri ve ürün belgeleri.",
    sections: [
      {
        h2: "Sevkiyat belgeleri",
        bullets: [
          "Ticari fatura (GTİP kodu, menşe, birim fiyat)",
          "Çeki listesi",
          "A.TR dolaşım belgesi",
          "CMR (karayolu)",
          "Sigorta poliçesi (varsa)",
        ],
      },
      {
        h2: "Ürün belgeleri",
        bullets: [
          "CE işareti gereken ürünlerde AB uygunluk beyanı ve test raporları",
          "Almanca etiket ve kullanım talimatı",
          "Ürün güvenliği için üretici ve AB sorumlu kişi bilgisi",
          "Ambalaj kaydı (LUCID) numarası",
          "Elektrikli ürünlerde WEEE kaydı",
          "Gıdada Almanca içerik ve alerjen etiketi",
        ],
      },
    ],
    cta: {
      title: "Eksik belgenizi öğrenin",
      text: "Ürününüze göre belge listesini uygunluk raporunda çıkarıyoruz.",
    },
    schema: "Article",
    updated: U,
  },
  {
    slug: "amazon-almanyada-nasil-satis-yapilir",
    title: "Amazon Almanya'da Nasıl Satış Yapılır? Adım Adım (2026)",
    description:
      "Türkiye'den Amazon.de'de satış: hesap açma, vergi ve kayıt gereksinimleri, FBA veya kendi depo, Almanca listeleme ve reklam. Adım adım rehber.",
    kicker: "Rehber",
    h1: "Amazon Almanya'da nasıl satış yapılır?",
    intro:
      "Amazon.de'de satış, hesap açmaktan çok daha fazlası: vergi kaydı, ambalaj ve ürün güvenliği yükümlülükleri, lojistik modeli ve Almanca içerik birlikte planlanmalı.",
    sections: [
      {
        h2: "Adımlar",
        steps: [
          {
            title: "Model seçimi",
            text: "Türk firmasıyla mı, Alman şirketiyle mi satacağınıza karar verin.",
          },
          {
            title: "Kayıtlar",
            text: "Almanya'da stok tutacaksanız KDV kaydı, ambalaj kaydı ve gerekiyorsa diğer kayıtlar.",
          },
          {
            title: "Satıcı hesabı",
            text: "Kimlik ve şirket belgeleriyle hesap açılır, doğrulama yapılır.",
          },
          { title: "Lojistik", text: "FBA, kendi deponuz veya ikisinin birlikte kullanımı." },
          { title: "Listeleme", text: "Almanca başlık, açıklama, anahtar kelimeler ve görseller." },
          {
            title: "Reklam ve ölçüm",
            text: "Sponsorlu ürün reklamlarıyla ilk satışlar ve yorumlar.",
          },
        ],
      },
    ],
    cta: {
      title: "Amazon.de'ye hazırlık kontrolü",
      text: "Ücretsiz raporda kategoriniz için gerekenleri listeliyoruz.",
    },
    schema: "Article",
    updated: U,
  },
];

export const guideBySlug = new Map(guides.map((g) => [g.slug, g]));
