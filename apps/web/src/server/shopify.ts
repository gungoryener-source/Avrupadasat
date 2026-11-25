/**
 * Almanca web mağaza kanalı: Shopify Admin GraphQL API.
 * Firma kendi Shopify mağazasını (Almanca vitrin, Impressum, AGB, Widerrufsbelehrung, ödeme) işletir;
 * platform siparişleri çeker, depodan kargolar, takip numarasını ve stoğu mağazaya yazar.
 * Kimlik bilgisi: mağaza alan adı + özel uygulama (custom app) erişim anahtarı + depo konumu (locationId).
 * TODO(verify): Alıcı adresi için "protected customer data" (Level 2) erişim onayı; API sürümü yükseltme
 * takvimi (her çeyrek) ve inventorySetQuantities girdisi bir geliştirme mağazasında doğrulanmalı.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { requestWithRetry, toCents, type HttpDeps } from "./http";
import type { ExternalOrder, MarketplaceAdapter } from "./marketplace";

export const SHOPIFY_API_VERSION = "2026-10";

export interface ShopifyCredentials {
  /** ör. ornek-magaza.myshopify.com */
  shop: string;
  accessToken: string;
  /** gid://shopify/Location/… — depodaki stoğun yazılacağı konum */
  locationId: string;
}

export const SHOP_DOMAIN_RE = /^[a-z0-9][a-z0-9-]{1,60}\.myshopify\.com$/;

type Gql<T> = { data?: T; errors?: { message: string; extensions?: { code?: string } }[] };

const ORDERS_Q = `query Orders($first: Int!, $after: String, $q: String!) {
  orders(first: $first, after: $after, query: $q, sortKey: CREATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id name createdAt cancelledAt
      shippingAddress { name address1 address2 zip city countryCodeV2 }
      lineItems(first: 100) { nodes { id sku quantity originalUnitPriceSet { shopMoney { amount } } } }
    }
  }
}`;

const FO_Q = `query FO($id: ID!) { order(id: $id) { fulfillmentOrders(first: 20) { nodes { id status lineItems(first: 100) { nodes { id remainingQuantity lineItem { id } } } } } } }`;

const FULFILL_M = `mutation F($f: FulfillmentInput!) { fulfillmentCreate(fulfillment: $f) { fulfillment { id } userErrors { field message } } }`;

const VARIANT_Q = `query V($q: String!) { productVariants(first: 1, query: $q) { nodes { sku inventoryItem { id } } } }`;

const SET_QTY_M = `mutation S($input: InventorySetQuantitiesInput!) { inventorySetQuantities(input: $input) { userErrors { field message } } }`;

export function shopifyAdapter(
  creds: ShopifyCredentials,
  deps: HttpDeps & { now?: () => number } = {},
): MarketplaceAdapter {
  if (!SHOP_DOMAIN_RE.test(creds.shop)) throw new Error("Geçersiz Shopify mağaza alan adı");
  const url = `https://${creds.shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const now = deps.now ?? Date.now;

  async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const r = await requestWithRetry(
      "Shopify",
      url,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-shopify-access-token": creds.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      },
      deps,
      // GraphQL kısıtlaması 200 + THROTTLED olarak döner
      (s, body) => s === 429 || s >= 500 || (s === 200 && body.includes('"THROTTLED"')),
    );
    const j = JSON.parse(r.body) as Gql<T>;
    if (j.errors?.length)
      throw new Error(`Shopify hatası: ${j.errors.map((e) => e.message).join("; ")}`);
    return j.data as T;
  }

  return {
    channel: "WEBSHOP",
    async fetchOrders(since) {
      const from = new Date(
        (since?.getTime() ?? now() - 7 * 86_400_000) - 10 * 60_000,
      ).toISOString();
      const q = `created_at:>='${from}' AND fulfillment_status:unfulfilled AND financial_status:paid`;
      const out: ExternalOrder[] = [];
      let after: string | null = null;
      for (let page = 0; page < 20; page++) {
        type R = {
          orders: {
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
            nodes: {
              id: string;
              name: string;
              createdAt: string;
              cancelledAt: string | null;
              shippingAddress: null | {
                name?: string;
                address1?: string;
                address2?: string;
                zip?: string;
                city?: string;
                countryCodeV2?: string;
              };
              lineItems: {
                nodes: {
                  id: string;
                  sku: string | null;
                  quantity: number;
                  originalUnitPriceSet: { shopMoney: { amount: string } };
                }[];
              };
            }[];
          };
        };
        const d: R = await gql<R>(ORDERS_Q, { first: 50, after, q });
        for (const o of d.orders.nodes) {
          if (o.cancelledAt || !o.shippingAddress) continue; // dijital/teslim alma siparişleri depoya gelmez
          const a = o.shippingAddress;
          out.push({
            externalId: o.id,
            orderedAt: new Date(o.createdAt),
            buyer: {
              name: a.name ?? "",
              street: [a.address1, a.address2].filter(Boolean).join(", "),
              zip: a.zip ?? "",
              city: a.city ?? "",
              country: a.countryCodeV2 ?? "DE",
            },
            lines: o.lineItems.nodes
              .filter((l) => l.sku)
              .map((l) => ({
                externalLineId: l.id,
                sku: l.sku!,
                quantity: l.quantity,
                priceCents: toCents(l.originalUnitPriceSet.shopMoney.amount),
              })),
          });
        }
        if (!d.orders.pageInfo.hasNextPage) break;
        after = d.orders.pageInfo.endCursor;
      }
      return out;
    },
    async pushTracking(externalId, carrier, trackingNo) {
      type R = { order: { fulfillmentOrders: { nodes: { id: string; status: string }[] } } | null };
      const d = await gql<R>(FO_Q, { id: externalId });
      const open = (d.order?.fulfillmentOrders.nodes ?? []).filter(
        (f) => f.status === "OPEN" || f.status === "IN_PROGRESS",
      );
      if (!open.length) throw new Error("Shopify siparişinde açık gönderim kaydı yok");
      type M = { fulfillmentCreate: { userErrors: { message: string }[] } };
      const m = await gql<M>(FULFILL_M, {
        f: {
          lineItemsByFulfillmentOrder: open.map((f) => ({ fulfillmentOrderId: f.id })),
          trackingInfo: { company: carrier, number: trackingNo },
          notifyCustomer: true,
        },
      });
      if (m.fulfillmentCreate.userErrors.length)
        throw new Error(
          `Shopify gönderim hatası: ${m.fulfillmentCreate.userErrors.map((e) => e.message).join("; ")}`,
        );
    },
    async pushStock(items) {
      const quantities: { inventoryItemId: string; locationId: string; quantity: number }[] = [];
      const missing: string[] = [];
      for (const it of items) {
        type V = { productVariants: { nodes: { sku: string; inventoryItem: { id: string } }[] } };
        const v = await gql<V>(VARIANT_Q, { q: `sku:${JSON.stringify(it.sku)}` });
        const node = v.productVariants.nodes.find((n) => n.sku === it.sku);
        if (!node) missing.push(it.sku);
        else
          quantities.push({
            inventoryItemId: node.inventoryItem.id,
            locationId: creds.locationId,
            quantity: Math.max(0, it.available),
          });
      }
      for (let i = 0; i < quantities.length; i += 100) {
        type S = { inventorySetQuantities: { userErrors: { message: string }[] } };
        const r = await gql<S>(SET_QTY_M, {
          input: {
            name: "available",
            reason: "correction",
            ignoreCompareQuantity: true,
            quantities: quantities.slice(i, i + 100),
          },
        });
        if (r.inventorySetQuantities.userErrors.length)
          throw new Error(
            `Shopify stok hatası: ${r.inventorySetQuantities.userErrors.map((e) => e.message).join("; ")}`,
          );
      }
      if (missing.length) throw new Error(`Shopify'da bulunamayan SKU: ${missing.join(", ")}`);
    },
  };
}

/** Shopify webhook imzası: base64(HMAC-SHA256(ham gövde, uygulama gizli anahtarı)) */
export function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader: string | null,
  secret: string,
): boolean {
  if (!hmacHeader || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  let given: Buffer;
  try {
    given = Buffer.from(hmacHeader, "base64");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}
