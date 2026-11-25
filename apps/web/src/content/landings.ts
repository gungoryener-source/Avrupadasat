/** Reklam açılış sayfaları: tek hedef, sadeleştirilmiş menü, A/B başlık varyantı (?v=a|b) */
export interface Landing {
  slug: string;
  title: string;
  description: string;
  variants: Record<"a" | "b", { h1: string; sub: string; cta: string }>;
  bullets: string[];
}

export const landings: Landing[] = [
  {
    slug: "amazon-almanya",
    title: "Amazon Almanya'da Satış — Ücretsiz Uygunluk Raporu",
    description:
      "Amazon.de'de satışa hazır mısınız? Kayıtlar, lojistik ve Almanca listeleme için ücretsiz uygunluk raporu.",
    variants: {
      a: {
        h1: "Amazon Almanya'da satışa başlayın",
        sub: "Hesap, depo, gümrük ve Almanca listeleme: tek ekip, Türkçe.",
        cta: "Ücretsiz rapor al",
      },
      b: {
        h1: "Ürününüz Amazon.de'ye hazır mı?",
        sub: "48 saatte eksik kayıt ve belgelerinizi listeleyelim.",
        cta: "Hazırlığımı kontrol et",
      },
    },
    bullets: [
      "Kurulum ücreti yok, aylık fesih",
      "Almanya'da depo ve iade merkezi",
      "Ambalaj ve ürün güvenliği kayıtları dahil kontrol",
    ],
  },
  {
    slug: "almanyada-sirket-kurmak",
    title: "Almanya'da Şirket Kurmak — İhracatçı Firmalar İçin",
    description:
      "Almanya'ya gitmeden UG/GmbH kuruluşu. Şeffaf fiyat, Türkçe süreç. İhracatçı firmalar için.",
    variants: {
      a: {
        h1: "Almanya'ya gitmeden şirket kurun",
        sub: "İhracatçı firmalar için UG ve GmbH: €1.250'dan, şeffaf fiyat.",
        cta: "Ücretsiz değerlendirme",
      },
      b: {
        h1: "Almanya'da şirketiniz, Türkçe süreç",
        sub: "Vekâletname, apostil, noter ve vergi kaydı: adım adım panelde.",
        cta: "Maliyetimi öğren",
      },
    },
    bullets: [
      "İhracatçı firmalar için (oturum danışmanlığı yapmıyoruz)",
      "Noter ve harçlar faturasıyla birebir",
      "Vergi numarası beklenirken satışa hazırlık",
    ],
  },
  {
    slug: "almanyaya-e-ihracat",
    title: "Almanya'ya E-İhracat — Depo, Gümrük, Satış Tek Yerden",
    description:
      "Almanya'ya e-ihracatın tüm rotası: şirket, gümrük, depo, pazaryeri ve pazarlama. Ücretsiz uygunluk raporu.",
    variants: {
      a: {
        h1: "Almanya'ya e-ihracatın tüm rotası",
        sub: "Şirket, gümrük, depo, pazaryeri ve pazarlama: tek muhatap.",
        cta: "Ücretsiz rapor al",
      },
      b: {
        h1: "2026'da paket değil palet gönderin",
        sub: "Toplu ithalat, Almanya deposu ve yerel iade ile maliyeti düşürün.",
        cta: "Modelimi karşılaştır",
      },
    },
    bullets: [
      "Toplu ithalat ve A.TR",
      "Almanya'da stok ve 1–2 günde teslim",
      "Türkçe panelden takip",
    ],
  },
  {
    slug: "almanyada-depo",
    title: "Almanya'da Depo Kiralama — €13/palet",
    description: "Almanya'da depo ve fulfillment: €13/palet/ay, kurulum ücreti yok, aylık fesih.",
    variants: {
      a: {
        h1: "Almanya'da depo: €13/palet/ay",
        sub: "Kurulum ücreti yok, aylık fesih, Türkçe panel.",
        cta: "Maliyetimi hesapla",
      },
      b: {
        h1: "Almanya'yı 1–2 paletle test edin",
        sub: "Uzun sözleşme olmadan pilot sevkiyat.",
        cta: "Pilot için başvur",
      },
    },
    bullets: [
      "Mal kabul, paketleme, FBA hazırlığı",
      "İade işleme ve yeniden satış",
      "Yayınlanmış fiyat listesi",
    ],
  },
];

export const landingBySlug = new Map(landings.map((l) => [l.slug, l]));
