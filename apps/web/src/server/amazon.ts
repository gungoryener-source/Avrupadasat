/**
 * Amazon Selling Partner API (SP-API) — Avrupa uç noktası, Almanya pazaryeri.
 * - Kimlik: LWA refresh token → access token (önbellekli)
 * - Alıcı adresi (kişisel veri) yalnız Restricted Data Token (RDT) ile alınır
 * - 429/5xx: Retry-After veya üstel bekleme ile en fazla 3 yeniden deneme
 * Uygulama kimliği (client id/secret) ortamdan; satıcıya özel refresh token ve sellerId
 * MarketplaceConnection.credentialsEnc içinde şifreli saklanır.
 * TODO(verify): SP-API uygulama kaydı, gerekli roller (Inventory & Order Tracking, Direct-to-Consumer
 * Shipping — PII için) ve sandbox testi.
 */
import type { ExternalOrder, MarketplaceAdapter } from "./marketplace";

export const SPAPI_EU = "https://sellingpartnerapi-eu.amazon.com";
export const SPAPI_EU_SANDBOX = "https://sandbox.sellingpartnerapi-eu.amazon.com";
export const LWA_URL = "https://api.amazon.com/auth/o2/token";
export const MARKETPLACE_DE = "A1PA6795UKMFR9";

export interface AmazonCredentials {
  refreshToken: string;
  sellerId: string;
}

export interface AmazonAppConfig {
  clientId: string;
  clientSecret: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

interface SpOrder {
  AmazonOrderId: string;
  PurchaseDate: string;
  OrderStatus: string;
  FulfillmentChannel?: "MFN" | "AFN";
  ShippingAddress?: {
    Name?: string;
    AddressLine1?: string;
    AddressLine2?: string;
    PostalCode?: string;
    City?: string;
    CountryCode?: string;
  };
  BuyerInfo?: { BuyerName?: string };
}

interface SpOrderItem {
  OrderItemId: string;
  SellerSKU: string;
  QuantityOrdered: number;
  ItemPrice?: { Amount: string; CurrencyCode: string };
}

export class SpApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const toCents = (amount?: string) => (amount ? Math.round(Number(amount) * 100) : 0);

export function amazonAdapter(creds: AmazonCredentials, app: AmazonAppConfig): MarketplaceAdapter {
  const f = app.fetchImpl ?? fetch;
  const base = app.endpoint ?? SPAPI_EU;
  const sleep = app.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = app.now ?? Date.now;
  let token: { value: string; exp: number } | null = null;

  async function accessToken(): Promise<string> {
    if (token && token.exp - 60_000 > now()) return token.value;
    const res = await f(LWA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: creds.refreshToken,
        client_id: app.clientId,
        client_secret: app.clientSecret,
      }),
    });
    if (!res.ok)
      throw new SpApiError(
        res.status,
        "Amazon yetkilendirmesi başarısız (refresh token geçersiz olabilir)",
      );
    const j = (await res.json()) as { access_token: string; expires_in: number };
    token = { value: j.access_token, exp: now() + j.expires_in * 1000 };
    return token.value;
  }

  async function call<T>(
    method: string,
    path: string,
    opts: { body?: unknown; rdt?: string } = {},
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const res = await f(`${base}${path}`, {
        method,
        headers: {
          "x-amz-access-token": opts.rdt ?? (await accessToken()),
          "Content-Type": "application/json",
          "user-agent": "Avrupadasat/1.0 (Language=TypeScript)",
        },
        ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
      });
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        const ra = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 500 * 2 ** attempt);
        continue;
      }
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) {
        const msg =
          (json as { errors?: { message?: string }[] }).errors?.[0]?.message ??
          `HTTP ${res.status}`;
        throw new SpApiError(res.status, `Amazon SP-API: ${msg}`);
      }
      return json as T;
    }
  }

  /** Alıcı adresi için kısıtlı veri token'ı */
  async function rdtFor(path: string): Promise<string> {
    const r = await call<{ restrictedDataToken: string }>(
      "POST",
      "/tokens/2021-03-01/restrictedDataToken",
      {
        body: {
          restrictedResources: [
            { method: "GET", path, dataElements: ["buyerInfo", "shippingAddress"] },
          ],
        },
      },
    );
    return r.restrictedDataToken;
  }

  return {
    channel: "AMAZON",
    async fetchOrders(since) {
      const createdAfter = new Date(
        since ? since.getTime() - 10 * 60_000 : now() - 7 * 86_400_000,
      ).toISOString();
      const out: ExternalOrder[] = [];
      let nextToken: string | undefined;
      let pages = 0;
      do {
        const qs = new URLSearchParams(
          nextToken
            ? { MarketplaceIds: MARKETPLACE_DE, NextToken: nextToken }
            : {
                MarketplaceIds: MARKETPLACE_DE,
                CreatedAfter: createdAfter,
                OrderStatuses: "Unshipped,PartiallyShipped",
                FulfillmentChannels: "MFN",
              },
        );
        const path = "/orders/v0/orders";
        const rdt = await rdtFor(path);
        const page = await call<{ payload: { Orders: SpOrder[]; NextToken?: string } }>(
          "GET",
          `${path}?${qs}`,
          { rdt },
        );
        for (const o of page.payload.Orders) {
          if (o.FulfillmentChannel === "AFN") continue; // FBA siparişlerini Amazon gönderir
          const items: SpOrderItem[] = [];
          let itemToken: string | undefined;
          do {
            const ip = await call<{ payload: { OrderItems: SpOrderItem[]; NextToken?: string } }>(
              "GET",
              `/orders/v0/orders/${encodeURIComponent(o.AmazonOrderId)}/orderItems${itemToken ? `?NextToken=${encodeURIComponent(itemToken)}` : ""}`,
            );
            items.push(...ip.payload.OrderItems);
            itemToken = ip.payload.NextToken;
          } while (itemToken);
          const a = o.ShippingAddress ?? {};
          out.push({
            externalId: o.AmazonOrderId,
            orderedAt: new Date(o.PurchaseDate),
            buyer: {
              name: a.Name ?? o.BuyerInfo?.BuyerName ?? "",
              street: [a.AddressLine1, a.AddressLine2].filter(Boolean).join(", "),
              zip: a.PostalCode ?? "",
              city: a.City ?? "",
              country: a.CountryCode ?? "DE",
            },
            lines: items.map((i) => ({
              externalLineId: i.OrderItemId,
              sku: i.SellerSKU,
              quantity: i.QuantityOrdered,
              // ItemPrice satırın toplamıdır; birim fiyata çevrilir
              priceCents:
                i.QuantityOrdered > 0
                  ? Math.round(toCents(i.ItemPrice?.Amount) / i.QuantityOrdered)
                  : 0,
            })),
          });
        }
        nextToken = page.payload.NextToken;
        pages++;
      } while (nextToken && pages < 20);
      return out;
    },
    async pushTracking(externalId, carrier, trackingNo, lines = []) {
      if (lines.length === 0 || lines.some((l) => !l.externalLineId))
        throw new Error("Kargo onayı için Amazon kalem kimlikleri gerekli");
      await call("POST", `/orders/v0/orders/${encodeURIComponent(externalId)}/shipment/confirm`, {
        body: {
          marketplaceId: MARKETPLACE_DE,
          packageDetail: {
            packageReferenceId: "1",
            carrierCode: carrier,
            trackingNumber: trackingNo,
            shipDate: new Date(now()).toISOString(),
            orderItems: lines.map((l) => ({ orderItemId: l.externalLineId, quantity: l.quantity })),
          },
        },
      });
    },
    async pushStock(items) {
      for (const it of items) {
        await call(
          "PATCH",
          `/listings/2021-08-01/items/${encodeURIComponent(creds.sellerId)}/${encodeURIComponent(it.sku)}?marketplaceIds=${MARKETPLACE_DE}`,
          {
            body: {
              productType: "PRODUCT",
              patches: [
                {
                  op: "replace",
                  path: "/attributes/fulfillment_availability",
                  value: [
                    { fulfillment_channel_code: "DEFAULT", quantity: Math.max(0, it.available) },
                  ],
                },
              ],
            },
          },
        );
      }
    },
  };
}
