import type { ContentPage } from "./types";

/**
 * Hukuki metin ŞABLONLARI — yayından önce avukat onayı gerekir (CLAUDE.md § 4).
 * Köşeli parantezli alanlar doldurulmalıdır.
 */
const U = "2026-11-25";
const DRAFT = "Bu metin taslaktır; yayından önce hukuk danışmanı tarafından gözden geçirilecektir.";

export const legal: ContentPage[] = [
  {
    slug: "kvkk",
    title: "KVKK Aydınlatma Metni",
    description:
      "KVKK kapsamında aydınlatma metni: işlenen kişisel veriler, amaçlar, hukuki sebepler, aktarım ve haklarınız.",
    kicker: "Hukuki",
    h1: "KVKK aydınlatma metni",
    intro: DRAFT,
    sections: [
      {
        h2: "Veri sorumlusu",
        paragraphs: ["[Şirket unvanı], [adres], [e-posta] (“Avrupadasat”)."],
      },
      {
        h2: "İşlenen veriler ve amaçlar",
        bullets: [
          "Kimlik ve iletişim (ad, e-posta, telefon, firma): uygunluk raporu ve teklif talebinizi yanıtlamak, sözleşmeyi kurmak ve yürütmek",
          "Müşteri işlem verileri (sevkiyat, stok, fatura): hizmetin ifası, faturalama, yasal saklama",
          "İşlem güvenliği (IP, oturum, giriş kayıtları): bilgi güvenliğinin sağlanması",
          "Pazarlama izni verdiyseniz: rehber ve duyuru e-postaları",
          "Çerez onayı verdiyseniz: site kullanım istatistikleri ve reklam ölçümü",
        ],
      },
      {
        h2: "Hukuki sebepler",
        paragraphs: [
          "KVKK m.5/2-c (sözleşmenin kurulması ve ifası), m.5/2-ç (hukuki yükümlülük), m.5/2-f (meşru menfaat — güvenlik) ve pazarlama ile çerezler için m.5/1 (açık rıza).",
        ],
      },
      {
        h2: "Aktarım",
        paragraphs: [
          "Hizmetin ifası için Almanya'daki iş ortaklarımıza (depo, vergi danışmanı, noter, avukat, gümrük müşaviri) ve AB'de barındırılan hizmet sağlayıcılarımıza aktarım yapılır. Yurt dışına aktarım KVKK m.9 kapsamındaki güvencelerle yapılır. [Aktarım mekanizması avukatla netleştirilecek]",
        ],
      },
      {
        h2: "Haklarınız",
        paragraphs: [
          "KVKK m.11 kapsamındaki haklarınız için [e-posta] adresine başvurabilirsiniz.",
        ],
      },
    ],
    schema: "WebPage",
    updated: U,
  },
  {
    slug: "gizlilik",
    title: "Gizlilik Politikası (Datenschutzerklärung)",
    description: "Kişisel verilerin işlenmesi, kullanılan araçlar ve haklarınız.",
    kicker: "Hukuki",
    h1: "Gizlilik politikası",
    intro: DRAFT,
    sections: [
      {
        h2: "Sorumlu",
        paragraphs: ["[Şirket unvanı], [adres], [e-posta]. Veri koruma görevlisi: [varsa]."],
      },
      {
        h2: "Barındırma",
        paragraphs: [
          "Site ve veritabanı AB içinde (Frankfurt bölgesi) barındırılır. Hizmet sağlayıcılarla veri işleme sözleşmesi (AVV) yapılmıştır. [Sağlayıcı adları]",
        ],
      },
      {
        h2: "Kullanılan araçlar",
        table: {
          head: ["Araç", "Amaç", "Hukuki dayanak"],
          rows: [
            ["Oturum çerezi", "Giriş ve güvenlik", "Zorunlu (DSGVO m.6/1-b, f)"],
            ["Cloudflare Turnstile", "Form kötüye kullanımını önleme", "Meşru menfaat (m.6/1-f)"],
            ["Google Tag Manager / Analytics", "İstatistik", "Onay (m.6/1-a, TDDDG §25)"],
            ["Google Ads (Enhanced Conversions)", "Reklam ölçümü", "Onay"],
            ["Meta Pixel ve Conversions API", "Reklam ölçümü", "Onay"],
            ["CRM ve e-posta altyapısı", "Talep ve müşteri iletişimi", "Sözleşme (m.6/1-b)"],
          ],
        },
        note: "Onay vermediğiniz sürece istatistik ve reklam araçları yüklenmez.",
      },
      {
        h2: "Saklama süreleri",
        paragraphs: [
          "Talepler: [süre]. Müşteri ve fatura kayıtları: yasal saklama süreleri boyunca. Güvenlik kayıtları: [süre].",
        ],
      },
      {
        h2: "Haklarınız",
        paragraphs: [
          "Erişim, düzeltme, silme, işlemeyi kısıtlama, veri taşınabilirliği, itiraz ve onayı geri çekme haklarına sahipsiniz; denetim makamına şikâyet edebilirsiniz.",
        ],
      },
    ],
    schema: "WebPage",
    updated: U,
  },
  {
    slug: "cerezler",
    title: "Çerez Politikası",
    description: "Sitede kullanılan çerezler ve tercihlerinizi nasıl değiştirebileceğiniz.",
    kicker: "Hukuki",
    h1: "Çerez politikası",
    intro: DRAFT,
    sections: [
      {
        h2: "Çerez türleri",
        table: {
          head: ["Tür", "Örnek", "Onay"],
          rows: [
            ["Zorunlu", "Oturum, güvenlik, çerez tercihinin saklanması", "Gerekmez"],
            ["İstatistik", "Google Analytics", "Gerekir"],
            ["Pazarlama", "Google Ads, Meta Pixel", "Gerekir"],
          ],
        },
      },
      {
        h2: "Tercihinizi değiştirme",
        paragraphs: [
          "Sayfanın altındaki “Çerez ayarları” bağlantısından tercihinizi istediğiniz zaman değiştirebilir veya geri çekebilirsiniz. Onay kaydınız kişisel veri içermeden saklanır.",
        ],
      },
    ],
    schema: "WebPage",
    updated: U,
  },
  {
    slug: "hizmet-sartlari",
    title: "Hizmet Şartları",
    description:
      "Avrupadasat hizmet şartları: kapsam, ücretler, süre ve fesih, sorumluluk ve ürün uygunluğu (taslak).",
    kicker: "Hukuki",
    h1: "Hizmet şartları",
    intro: DRAFT,
    sections: [
      {
        h2: "Taraflar ve kapsam",
        paragraphs: [
          "Bu şartlar, [Şirket unvanı] ile teklifi çevrimiçi onaylayan müşteri firma arasındaki hizmet ilişkisini düzenler. Hizmet kapsamı onaylanan teklifte belirtilir.",
        ],
      },
      {
        h2: "Bağımsızlık",
        paragraphs: [
          "Avrupadasat resmî bir kurum değildir. Hukuki ve vergisel işlemler lisanslı iş ortakları tarafından yürütülür.",
        ],
      },
      {
        h2: "Ücretler",
        paragraphs: [
          "Aylık ücretler peşin, kullanım bazlı ücretler ay sonunda faturalanır. Üçüncü taraf masrafları faturasıyla yansıtılır. Kurulum ücreti yoktur.",
        ],
      },
      {
        h2: "Süre ve fesih",
        paragraphs: [
          "Aylık hizmetler bir ay önceden yazılı bildirimle feshedilebilir. Depodaki malların iadesi veya devri [koşullar].",
        ],
      },
      {
        h2: "Sorumluluk ve sigorta",
        paragraphs: [
          "[Depo sigortası, sorumluluk sınırları ve mücbir sebep — avukatla netleştirilecek]",
        ],
      },
      {
        h2: "Ürün sorumluluğu",
        paragraphs: [
          "Ürünlerin AB mevzuatına uygunluğundan üretici/satıcı sorumludur; Avrupadasat koordinasyon ve kontrol listesi desteği verir. [İthalatçı sorumluluğu modeli — Kapı 0 kararı]",
        ],
      },
      { h2: "Uygulanacak hukuk", paragraphs: ["[Belirlenecek]"] },
    ],
    schema: "WebPage",
    updated: U,
  },
  {
    slug: "impressum",
    title: "Impressum",
    description:
      "Impressum — Angaben gemäß § 5 DDG: Anbieter, Vertretung, Kontakt, Registereintrag und USt-IdNr.",
    kicker: "Hukuki",
    h1: "Impressum",
    intro: "Angaben gemäß § 5 DDG. Alman şirketi kurulduğunda doldurulacak şablondur.",
    sections: [
      {
        h2: "Anbieter",
        paragraphs: ["[Firmenname GmbH/UG]", "[Straße Nr.], [PLZ Ort], Deutschland"],
      },
      { h2: "Vertreten durch", paragraphs: ["[Geschäftsführer]"] },
      { h2: "Kontakt", paragraphs: ["E-Mail: [E-Mail], Telefon: [Telefon]"] },
      {
        h2: "Registereintrag",
        paragraphs: ["Registergericht: [Amtsgericht], Registernummer: [HRB]"],
      },
      { h2: "Umsatzsteuer-ID", paragraphs: ["USt-IdNr. gemäß § 27a UStG: [DE…]"] },
    ],
    schema: "WebPage",
    updated: U,
  },
];

export const legalBySlug = new Map(legal.map((l) => [l.slug, l]));
