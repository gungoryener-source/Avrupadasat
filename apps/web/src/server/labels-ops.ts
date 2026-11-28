export const ORDER_STATUS = {
  NEW: ["Alındı", ""],
  ON_HOLD: ["Beklemede", "red"],
  ALLOCATED: ["Hazırlanıyor", "warn"],
  PACKED: ["Paketlendi", "warn"],
  SHIPPED: ["Kargoda", "ok"],
  DELIVERED: ["Teslim edildi", "ok"],
  RETURNED: ["İade edildi", ""],
  CANCELLED: ["İptal", ""],
} as const;

export const CHANNEL_LABEL = {
  AMAZON: "Amazon.de",
  EBAY: "eBay.de",
  WEBSHOP: "Web mağaza (Shopify)",
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

export const ORDER_STATUS_LABEL = Object.fromEntries(
  Object.entries(ORDER_STATUS).map(([k, v]) => [k, v[0]]),
) as Record<keyof typeof ORDER_STATUS, string>;
