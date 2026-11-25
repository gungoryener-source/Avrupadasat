/**
 * eBay Sell API — eBay.de (EBAY_DE).
 * - Kimlik: kullanıcı refresh token'ı → access token (önbellekli; uygulama kimliği ortamdan)
 * - Siparişler: Fulfillment API getOrders (gönderilmemiş, sayfalı)
 * - Kargo: shipping_fulfillment (kalem kimlikleriyle)
 * - Stok: Inventory API bulk_update_price_quantity (en fazla 25 SKU/istek)
 * TODO(verify): Stok güncellemesi yalnız Inventory API ile oluşturulmuş ilanlarda çalışır; Seller Hub'dan
 * açılmış eski ilanlar için Trading API (ReviseInventoryStatus) gerekir. Sandbox hesabıyla doğrulanmalı.
 */
import { requestWithRetry, toCents, type HttpDeps } from "./http";
import type { ExternalOrder, MarketplaceAdapter } from "./marketplace";

export const EBAY_API = "https://api.ebay.com";
export const EBAY_SANDBOX_API = "https://api.sandbox.ebay.com";
export const EBAY_SCOPES = [
  "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
  "https://api.ebay.com/oauth/api_scope/sell.inventory",
];

export interface EbayCredentials {
  refreshToken: string;
}

export interface EbayAppConfig extends HttpDeps {
  clientId: string;
  clientSecret: string;
  endpoint?: string;
  now?: () => number;
}

interface EbayOrder {
  orderId: string;
  creationDate: string;
  orderFulfillmentStatus: string;
  cancelStatus?: { cancelState?: string };
  fulfillmentStartInstructions?: {
    shippingStep?: {
      shipTo?: {
        fullName?: string;
        contactAddress?: {
          addressLine1?: string;
          addressLine2?: string;
          city?: string;
          postalCode?: string;
          countryCode?: string;
        };
      };
    };
  }[];
  lineItems: {
    lineItemId: string;
    sku?: string;
    quantity: number;
    lineItemCost?: { value: string };
  }[];
}

export function ebayAdapter(creds: EbayCredentials, app: EbayAppConfig): MarketplaceAdapter {
  const base = app.endpoint ?? EBAY_API;
  const now = app.now ?? Date.now;
  let token: { value: string; exp: number } | null = null;

  async function accessToken(): Promise<string> {
    if (token && token.exp > now() + 60_000) return token.value;
    const basic = Buffer.from(`${app.clientId}:${app.clientSecret}`).toString("base64");
    const r = await requestWithRetry(
      "eBay",
      `${base}/identity/v1/oauth2/token`,
      {
        method: "POST",
        headers: {
          authorization: `Basic ${basic}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: creds.refreshToken,
          scope: EBAY_SCOPES.join(" "),
        }).toString(),
      },
      app,
    ).catch((e: Error) => {
      throw new Error(`eBay yetkilendirmesi başarısız: ${e.message}`);
    });
    const j = JSON.parse(r.body) as { access_token: string; expires_in: number };
    token = { value: j.access_token, exp: now() + j.expires_in * 1000 };
    return token.value;
  }

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const r = await requestWithRetry(
      "eBay",
      `${base}${path}`,
      {
        method,
        headers: {
          authorization: `Bearer ${await accessToken()}`,
          "content-type": "application/json",
          "x-ebay-c-marketplace-id": "EBAY_DE",
          "content-language": "de-DE",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      app,
    );
    return (r.body ? JSON.parse(r.body) : {}) as T;
  }

  return {
    channel: "EBAY",
    async fetchOrders(since) {
      const from = new Date(
        (since?.getTime() ?? now() - 7 * 86_400_000) - 10 * 60_000,
      ).toISOString();
      const filter = `creationdate:[${from}..],orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS}`;
      const out: ExternalOrder[] = [];
      for (let offset = 0, page = 0; page < 20; page++) {
        const q = new URLSearchParams({ filter, limit: "50", offset: String(offset) });
        const r = await call<{ orders?: EbayOrder[]; total?: number }>(
          "GET",
          `/sell/fulfillment/v1/order?${q}`,
        );
        for (const o of r.orders ?? []) {
          if (o.cancelStatus?.cancelState && o.cancelStatus.cancelState !== "NONE_REQUESTED")
            continue;
          const to = o.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo;
          const a = to?.contactAddress;
          out.push({
            externalId: o.orderId,
            orderedAt: new Date(o.creationDate),
            buyer: {
              name: to?.fullName ?? "",
              street: [a?.addressLine1, a?.addressLine2].filter(Boolean).join(", "),
              zip: a?.postalCode ?? "",
              city: a?.city ?? "",
              country: a?.countryCode ?? "DE",
            },
            lines: o.lineItems
              .filter((l) => l.sku)
              .map((l) => ({
                externalLineId: l.lineItemId,
                sku: l.sku!,
                quantity: l.quantity,
                // lineItemCost kalem toplamıdır → birim fiyat
                priceCents: Math.round(toCents(l.lineItemCost?.value) / Math.max(1, l.quantity)),
              })),
          });
        }
        offset += 50;
        if (offset >= (r.total ?? 0)) break;
      }
      return out;
    },
    async pushTracking(externalId, carrier, trackingNo, lines) {
      if (!lines?.length || lines.some((l) => !l.externalLineId))
        throw new Error("eBay kargo bildirimi için kalem kimlikleri gerekli");
      await call(
        "POST",
        `/sell/fulfillment/v1/order/${encodeURIComponent(externalId)}/shipping_fulfillment`,
        {
          lineItems: lines.map((l) => ({ lineItemId: l.externalLineId, quantity: l.quantity })),
          shippedDate: new Date(now()).toISOString(),
          shippingCarrierCode: carrier,
          trackingNumber: trackingNo,
        },
      );
    },
    async pushStock(items) {
      for (let i = 0; i < items.length; i += 25) {
        const r = await call<{
          responses?: { sku: string; statusCode: number; errors?: { message: string }[] }[];
        }>("POST", "/sell/inventory/v1/bulk_update_price_quantity", {
          requests: items.slice(i, i + 25).map((s) => ({
            sku: s.sku,
            shipToLocationAvailability: { quantity: Math.max(0, s.available) },
          })),
        });
        const failed = (r.responses ?? []).filter((x) => x.statusCode >= 400);
        if (failed.length)
          throw new Error(
            `eBay stok güncellenemedi: ${failed.map((f) => `${f.sku} (${f.errors?.[0]?.message ?? f.statusCode})`).join(", ")}`,
          );
      }
    },
  };
}
