/**
 * Pazaryeri adaptörleri. Aynı arayüz: mock (demo verisi) ve live (Amazon SP-API / eBay API).
 * Live adaptörler kimlik bilgileri girilince bağlanacak; o zamana kadar açıkça hata verir.
 */
import type { SalesChannel } from "@avrupadasat/db";

export interface ExternalOrder {
  externalId: string;
  orderedAt: Date;
  buyer: { name: string; street: string; zip: string; city: string; country: string };
  lines: { sku: string; quantity: number; priceCents: number; externalLineId?: string }[];
}

export interface MarketplaceAdapter {
  channel: SalesChannel;
  fetchOrders(since: Date | null): Promise<ExternalOrder[]>;
  pushTracking(
    externalId: string,
    carrier: string,
    trackingNo: string,
    lines?: { externalLineId: string | null; quantity: number }[],
  ): Promise<void>;
  pushStock(items: { sku: string; available: number }[]): Promise<void>;
}

const NAMES = [
  "Anna Schmidt",
  "Lukas Weber",
  "Mia Fischer",
  "Jonas Wagner",
  "Lea Becker",
  "Paul Hoffmann",
];
const CITIES: [string, string][] = [
  ["10115", "Berlin"],
  ["50667", "Köln"],
  ["80331", "München"],
  ["20095", "Hamburg"],
  ["60311", "Frankfurt am Main"],
];

/** Demo verisi: katalogdaki SKU'lardan belirli sayıda sipariş üretir */
export function mockAdapter(
  channel: SalesChannel,
  skus: string[],
  seed = Date.now(),
): MarketplaceAdapter {
  const log: string[] = [];
  return {
    channel,
    async fetchOrders() {
      if (skus.length === 0) return [];
      return [0, 1, 2].map((i) => {
        const n = (seed + i) % 997;
        const [zip, city] = CITIES[n % CITIES.length]!;
        const sku = skus[n % skus.length]!;
        const lines = [{ sku, quantity: 1 + (n % 2), priceCents: 1990 + (n % 5) * 500 }];
        if (skus.length > 1 && n % 3 === 0)
          lines.push({ sku: skus[(n + 1) % skus.length]!, quantity: 1, priceCents: 2490 });
        return {
          externalId: `${channel === "AMAZON" ? "302" : channel === "WEBSHOP" ? "SH" : "EB"}-${seed}-${i}`,
          orderedAt: new Date(),
          buyer: {
            name: NAMES[n % NAMES.length]!,
            street: `Musterstraße ${1 + (n % 90)}`,
            zip,
            city,
            country: "DE",
          },
          lines,
        };
      });
    },
    async pushTracking(externalId, carrier, trackingNo) {
      log.push(`tracking ${externalId} ${carrier} ${trackingNo}`);
    },
    async pushStock(items) {
      log.push(`stock ${items.length}`);
    },
  };
}

export function liveAdapter(channel: SalesChannel): MarketplaceAdapter {
  const missing =
    channel === "AMAZON"
      ? !process.env.AMAZON_SP_API_CLIENT_ID
      : channel === "EBAY"
        ? !process.env.EBAY_CLIENT_ID
        : false;
  const fail = async (): Promise<never> => {
    throw new Error(
      missing
        ? `${channel} canlı bağlantısı için API kimlik bilgileri tanımlı değil`
        : `${channel} canlı bağlantısı için firma kimlik bilgileri girilmemiş`,
    );
  };
  return { channel, fetchOrders: fail, pushTracking: fail, pushStock: fail };
}
