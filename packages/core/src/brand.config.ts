/**
 * Marka ayarları — kodda marka adı YALNIZCA buradan okunur.
 * Ad değişirse (tescil sorgusu sonrası) tek yerden güncellenir.
 */
export const brand = {
  name: "Avrupadasat",
  /** Logoda iki parça: "Avrupada" + vurgulu "Sat" */
  nameParts: ["Avrupada", "Sat"] as const,
  monogram: "AS",
  tagline: "Türk üreticiler için Avrupa'ya satış",
  heroTitle: "Ürününüzü Avrupa'da satın. Gerisini biz yönetelim.",
  locale: "tr-TR",
  currency: "EUR",
  /** TODO(verify): alan adı karar bekliyor */
  domain: "avrupadasat.com",
  contact: {
    email: "merhaba@avrupadasat.com",
    /** Uluslararası biçimde, ör. "+90 5xx xxx xx xx"; boşsa WhatsApp butonu gizlenir */
    whatsapp: "" as string,
  },
  /** Bağımsızlık beyanı — sitede ve formlarda gösterilir */
  independenceNotice:
    "Avrupadasat resmî bir kurum değildir; bağımsız bir hizmet sağlayıcıdır. Hukuki ve vergisel işlemler lisanslı iş ortaklarınca yürütülür.",
} as const;

export type Brand = typeof brand;
