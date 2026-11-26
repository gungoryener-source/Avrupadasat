/**
 * Tek kaynaktan fiyat. Site, hesaplayıcı ve teklif bu tabloyu kullanır.
 * Tutarlar EURO CENT cinsinden tam sayıdır (kayan nokta hatası olmasın).
 * Fiyatlar TASLAK — partner maliyetleriyle teyit edilecek. TODO(verify)
 * İleride veritabanındaki tarih aralıklı `PriceList` kaydından okunur; bu dosya varsayılandır.
 */

export const PRICE_LIST_VERSION = "2026-11-taslak";

export const packages = {
  BASLANGIC: {
    name: "Başlangıç",
    oneTime: { UG: 125_000, GMBH: 300_000 },
    monthly: 0,
  },
  OPERASYON: {
    name: "Operasyon",
    monthly: 34_900,
  },
  PAZARA_GIRIS: {
    name: "Pazara Giriş",
    /** 30 palete kadar; üstü büyük hacim fiyatı */
    monthly: 49_900,
    monthlyLarge: 79_900,
    largeFromPallets: 31,
  },
} as const;

export const operations = {
  storagePerPalletMonth: 1_300,
  inboundPerCarton: 50,
  /** Aylık sipariş hacmine göre kademeli pick & pack */
  pickPackTiers: [
    { above: 2000, perOrder: 160 },
    { above: 800, perOrder: 185 },
    { above: 0, perOrder: 210 },
  ],
  preFbaPerCarton: 490,
  returnPerItem: 400,
  extras: {
    marketplacePerSku: 40,
    customerServicePerOrder: 35,
    accountingMonthly: 18_000,
  },
  setupFee: 0,
  noticePeriodMonths: 1,
} as const;

/**
 * Kuruluşta üçüncü taraf masrafları (noter, ticaret sicili, Türkiye'de vekâletname/tercüme) — TAHMİNİ aralık.
 * Dayanak (26.11.2026 kontrolü): IHK "Gebühren des Handelsregisterverfahrens" (Stand März 2026) —
 * tek ortaklı GmbH, 25.000 € sermaye: noter + sicil ≈ 730 € net (bireysel sözleşme), ≈ 550 € (Musterprotokoll);
 * UG'de Musterprotokoll ile noter ücreti sermayeye göre hesaplanır (daha düşük), bireysel sözleşmede
 * asgari 30.000 € işlem değeri GmbH ile aynı ücreti doğurur. Notere %19 KDV eklenir.
 * Türkiye tarafı: vekâletname (2026 noter tarifesi ~1.500–2.500 TL), apostil ücretsiz (kaymakamlık/valilik),
 * yeminli Almanca tercüme sayfa başına. Üst sınır: iki dilli tutanak/tercüman, çok ortaklı yapı, ek belgeler.
 * TODO(verify): Partner noterin yazılı teklifiyle kesinleştirilecek.
 * Sermaye: UG en az 1 € (pratikte daha fazlası önerilir), GmbH 25.000 € (kuruluşta en az 12.500 € yatırılır).
 */
export const formationThirdPartyEstimate = {
  UG: {
    minCents: 45_000,
    maxCents: 110_000,
    capitalNote: "Sermaye en az 1 €; pratikte en az birkaç bin € önerilir",
  },
  GMBH: {
    minCents: 75_000,
    maxCents: 180_000,
    capitalNote: "Sermaye 25.000 €; kuruluşta en az 12.500 € yatırılır",
  },
} as const;

export function estimateFormation(
  form: "UG" | "GMBH",
  pkg: "BASLANGIC" | "OPERASYON" | "PAZARA_GIRIS",
) {
  const service = packages.BASLANGIC.oneTime[form];
  const discount =
    pkg === "PAZARA_GIRIS" ? Math.round((service * PAZARA_GIRIS_SETUP_DISCOUNT_PCT) / 100) : 0;
  const est = formationThirdPartyEstimate[form];
  return {
    serviceCents: service - discount,
    thirdPartyMinCents: est.minCents,
    thirdPartyMaxCents: est.maxCents,
    totalMinCents: service - discount + est.minCents,
    totalMaxCents: service - discount + est.maxCents,
    capitalNote: est.capitalNote,
  };
}

/** Pazara Giriş paketinde kuruluş indirimi (%). TODO(verify): ticari karar */
export const PAZARA_GIRIS_SETUP_DISCOUNT_PCT = 30;

export type PackageCode = keyof typeof packages;
export type CompanyForm = "UG" | "GMBH" | "NONE";

export interface QuoteLine {
  code: string;
  description: string;
  quantity: number;
  unitCents: number;
  recurring: boolean;
}

/** Teklif kalemleri — site, teklif ve PDF aynı fonksiyonu kullanır */
export function buildQuoteLines(pkg: PackageCode, form: CompanyForm, pallets = 10): QuoteLine[] {
  const lines: QuoteLine[] = [];
  if (form !== "NONE") {
    const base = packages.BASLANGIC.oneTime[form];
    const label = form === "UG" ? "UG (haftungsbeschränkt)" : "GmbH";
    lines.push({
      code: `SETUP_${form}`,
      description: `${label} kuruluş koordinasyonu: vekâletname ve apostil rehberliği, noter, ticaret sicili, vergi kaydı`,
      quantity: 1,
      unitCents: base,
      recurring: false,
    });
    if (pkg === "PAZARA_GIRIS") {
      lines.push({
        code: "SETUP_DISCOUNT",
        description: `Pazara Giriş paketi kuruluş indirimi (%${PAZARA_GIRIS_SETUP_DISCOUNT_PCT})`,
        quantity: 1,
        unitCents: -Math.round((base * PAZARA_GIRIS_SETUP_DISCOUNT_PCT) / 100),
        recurring: false,
      });
    }
  }
  if (pkg === "OPERASYON") {
    lines.push({
      code: "SUB_OPERASYON",
      description:
        "Operasyon paketi: sanal ofis, muhasebe koordinasyonu, stok ve sevkiyat yazılımı",
      quantity: 1,
      unitCents: packages.OPERASYON.monthly,
      recurring: true,
    });
  }
  if (pkg === "PAZARA_GIRIS") {
    const large = pallets >= packages.PAZARA_GIRIS.largeFromPallets;
    lines.push({
      code: large ? "SUB_PAZARA_GIRIS_L" : "SUB_PAZARA_GIRIS",
      description: `Pazara Giriş paketi: depo yönetimi, gümrük takibi, Amazon.de/eBay.de, Almanca sayfalar ve pazarlama${large ? " (31+ palet)" : ""}`,
      quantity: 1,
      unitCents: large ? packages.PAZARA_GIRIS.monthlyLarge : packages.PAZARA_GIRIS.monthly,
      recurring: true,
    });
  }
  return lines;
}

export function quoteTotals(lines: QuoteLine[]) {
  let oneTime = 0;
  let monthly = 0;
  for (const l of lines) {
    const sum = l.quantity * l.unitCents;
    if (l.recurring) monthly += sum;
    else oneTime += sum;
  }
  return { oneTimeCents: oneTime, monthlyCents: monthly };
}

export function pickPackRate(ordersPerMonth: number): number {
  const tier = operations.pickPackTiers.find((t) => ordersPerMonth > t.above);
  return (tier ?? operations.pickPackTiers[operations.pickPackTiers.length - 1]!).perOrder;
}

export interface EstimateInput {
  pallets: number;
  ordersPerMonth: number;
  skus: number;
  marketplace: boolean;
  customerService: boolean;
  accounting: boolean;
}

export interface Estimate {
  storage: number;
  pickPack: number;
  subscription: number;
  extras: number;
  total: number;
  perOrder: number;
}

/** Sitedeki aylık maliyet hesaplayıcısının mantığı */
export function estimateMonthly(input: EstimateInput): Estimate {
  if (input.pallets < 0 || input.ordersPerMonth < 0 || input.skus < 0) {
    throw new RangeError("Değerler negatif olamaz");
  }
  const storage = input.pallets * operations.storagePerPalletMonth;
  const pickPack = input.ordersPerMonth * pickPackRate(input.ordersPerMonth);
  const subscription = !input.marketplace
    ? packages.OPERASYON.monthly
    : input.pallets >= packages.PAZARA_GIRIS.largeFromPallets
      ? packages.PAZARA_GIRIS.monthlyLarge
      : packages.PAZARA_GIRIS.monthly;
  let extras = 0;
  if (input.marketplace) extras += input.skus * operations.extras.marketplacePerSku;
  if (input.customerService)
    extras += input.ordersPerMonth * operations.extras.customerServicePerOrder;
  if (input.accounting) extras += operations.extras.accountingMonthly;
  const total = storage + pickPack + subscription + extras;
  const perOrder = input.ordersPerMonth > 0 ? Math.round(total / input.ordersPerMonth) : 0;
  return { storage, pickPack, subscription, extras, total, perOrder };
}

/** Türkçe metinde ek alabilsin diye simge önde: "€1.250'dan", "€1,95" */
export function formatEur(cents: number, opts: { decimals?: boolean } = {}): string {
  const n = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  }).format(Math.abs(cents) / 100);
  return `${cents < 0 ? "-" : ""}€${n}`;
}
