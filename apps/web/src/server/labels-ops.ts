export const ORDER_STATUS = {
  NEW: ["Yeni", ""],
  ON_HOLD: ["Beklemede", "red"],
  ALLOCATED: ["Hazırlanıyor", "warn"],
  SHIPPED: ["Kargoda", "ok"],
  DELIVERED: ["Teslim edildi", "ok"],
  CANCELLED: ["İptal", ""],
} as const;

export const CHANNEL_LABEL = {
  AMAZON: "Amazon.de",
  EBAY: "eBay.de",
  WEBSHOP: "Web mağaza",
  MANUAL: "Manuel",
} as const;

export const RETURN_CONDITION = {
  SELLABLE: "Satılabilir",
  REPACK: "Yeniden paketlenecek",
  DAMAGED: "Hasarlı",
} as const;

export const INVOICE_STATUS = {
  DRAFT: ["Taslak", ""],
  ISSUED: ["Kesildi", "warn"],
  PAID: ["Ödendi", "ok"],
  VOID: ["İptal", "red"],
} as const;
