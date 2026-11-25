import { createHmac } from "node:crypto";
import { encryptField } from "@avrupadasat/db/crypto";
import { describe, expect, it } from "vitest";
import { EBAY_API, EBAY_SANDBOX_API, ebayAdapter } from "./ebay";
import { liveAdapterFor, validateLiveCredentials } from "./orders";
import { shopifyAdapter, SHOPIFY_API_VERSION, verifyShopifyWebhook } from "./shopify";

type Call = { url: string; method: string; headers: Record<string, string>; body?: string };
const lower = (h: unknown) =>
  Object.fromEntries(
    Object.entries((h ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]),
  );
const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });
const noSleep = async () => undefined;
const NOW = () => Date.parse("2026-11-25T10:00:00Z");

function fakeEbay(opts: { throttle?: boolean } = {}) {
  const calls: Call[] = [];
  let throttled = false;
  const f = (async (url: string, init: RequestInit) => {
    calls.push({
      url,
      method: init.method ?? "GET",
      headers: lower(init.headers),
      body: init.body ? String(init.body) : undefined,
    });
    const u = new URL(url);
    if (u.pathname === "/identity/v1/oauth2/token")
      return json(200, { access_token: "v^1.1#ACCESS", expires_in: 7200 });
    if (u.pathname === "/sell/fulfillment/v1/order") {
      if (opts.throttle && !throttled) {
        throttled = true;
        return json(429, { errors: [{ errorId: 2001 }] }, { "retry-after": "2" });
      }
      const offset = Number(u.searchParams.get("offset"));
      const page =
        offset === 0
          ? [
              {
                orderId: "11-11111-11111",
                creationDate: "2026-11-25T08:00:00.000Z",
                orderFulfillmentStatus: "NOT_STARTED",
                cancelStatus: { cancelState: "NONE_REQUESTED" },
                fulfillmentStartInstructions: [
                  {
                    shippingStep: {
                      shipTo: {
                        fullName: "Mia Fischer",
                        contactAddress: {
                          addressLine1: "Ring 3",
                          city: "München",
                          postalCode: "80331",
                          countryCode: "DE",
                        },
                      },
                    },
                  },
                ],
                lineItems: [
                  {
                    lineItemId: "L1",
                    sku: "HV-50",
                    quantity: 3,
                    lineItemCost: { value: "59.70", currency: "EUR" },
                  },
                ],
              },
              {
                orderId: "11-99999-99999",
                creationDate: "2026-11-25T08:10:00.000Z",
                orderFulfillmentStatus: "NOT_STARTED",
                cancelStatus: { cancelState: "CANCEL_REQUESTED" },
                lineItems: [{ lineItemId: "L9", sku: "HV-50", quantity: 1 }],
              },
            ]
          : [
              {
                orderId: "22-22222-22222",
                creationDate: "2026-11-25T09:00:00.000Z",
                orderFulfillmentStatus: "IN_PROGRESS",
                fulfillmentStartInstructions: [
                  {
                    shippingStep: {
                      shipTo: {
                        fullName: "Paul Hoffmann",
                        contactAddress: {
                          addressLine1: "Allee 1",
                          addressLine2: "Hinterhaus",
                          city: "Hamburg",
                          postalCode: "20095",
                          countryCode: "DE",
                        },
                      },
                    },
                  },
                ],
                lineItems: [
                  { lineItemId: "L2", sku: "HV-70", quantity: 1, lineItemCost: { value: "24.90" } },
                ],
              },
            ];
      return json(200, { orders: page, total: 51 });
    }
    if (u.pathname.endsWith("/shipping_fulfillment")) return json(201, { fulfillmentId: "F1" });
    if (u.pathname === "/sell/inventory/v1/bulk_update_price_quantity") {
      const reqs = JSON.parse(String(init.body)).requests as { sku: string }[];
      return json(200, {
        responses: reqs.map((r) => ({
          sku: r.sku,
          statusCode: r.sku === "YOK" ? 404 : 200,
          errors: r.sku === "YOK" ? [{ message: "SKU bulunamadı" }] : [],
        })),
      });
    }
    return json(404, {});
  }) as unknown as typeof fetch;
  return { f, calls };
}

const ebayApp = (f: typeof fetch) => ({
  clientId: "App-123",
  clientSecret: "SECRET",
  fetchImpl: f,
  sleep: noSleep,
  now: NOW,
});

describe("eBay adaptörü", () => {
  it("token önbellekli; siparişler sayfalanır, iptal istenenler atlanır, birim fiyat hesaplanır", async () => {
    const { f, calls } = fakeEbay();
    const orders = await ebayAdapter(
      { refreshToken: "v^1.1#i^1#REFRESHTOKEN000000" },
      ebayApp(f),
    ).fetchOrders(new Date("2026-11-25T07:00:00Z"));
    expect(orders.map((o) => o.externalId)).toEqual(["11-11111-11111", "22-22222-22222"]);
    expect(orders[0]).toMatchObject({
      buyer: { name: "Mia Fischer", zip: "80331" },
      lines: [{ externalLineId: "L1", sku: "HV-50", quantity: 3, priceCents: 1990 }],
    });
    expect(orders[1]!.buyer.street).toBe("Allee 1, Hinterhaus");
    const tok = calls.filter((c) => c.url.endsWith("/oauth2/token"));
    expect(tok).toHaveLength(1);
    expect(tok[0]!.headers.authorization).toBe(
      `Basic ${Buffer.from("App-123:SECRET").toString("base64")}`,
    );
    expect(tok[0]!.body).toContain("grant_type=refresh_token");
    const list = calls.filter((c) => c.url.includes("/sell/fulfillment/v1/order?"));
    expect(list).toHaveLength(2);
    expect(list[0]!.headers["x-ebay-c-marketplace-id"]).toBe("EBAY_DE");
    expect(new URL(list[0]!.url).searchParams.get("filter")).toBe(
      "creationdate:[2026-11-25T06:50:00.000Z..],orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS}",
    );
    expect(list[0]!.url.startsWith(EBAY_API)).toBe(true);
  });

  it("429'da bekleyip yeniden dener", async () => {
    const { f } = fakeEbay({ throttle: true });
    const waits: number[] = [];
    const orders = await ebayAdapter(
      { refreshToken: "x" },
      { ...ebayApp(f), sleep: async (ms) => void waits.push(ms) },
    ).fetchOrders(null);
    expect(orders).toHaveLength(2);
    expect(waits).toEqual([2000]);
  });

  it("kargo bildirimi kalem kimlikleriyle; stok 25'erli gruplarla, hatalı SKU raporlanır", async () => {
    const { f, calls } = fakeEbay();
    const a = ebayAdapter({ refreshToken: "x" }, ebayApp(f));
    await a.pushTracking("11-11111-11111", "DHL", "00340434161234567890", [
      { externalLineId: "L1", quantity: 3 },
    ]);
    const sf = calls.find((c) => c.url.endsWith("/shipping_fulfillment"))!;
    expect(JSON.parse(sf.body!)).toEqual({
      lineItems: [{ lineItemId: "L1", quantity: 3 }],
      shippedDate: "2026-11-25T10:00:00.000Z",
      shippingCarrierCode: "DHL",
      trackingNumber: "00340434161234567890",
    });
    await expect(a.pushTracking("x", "DHL", "1", [])).rejects.toThrow(/kalem kimlik/);
    const items = Array.from({ length: 30 }, (_, i) => ({ sku: `S${i}`, available: i - 1 }));
    await a.pushStock(items);
    const bulk = calls.filter((c) => c.url.endsWith("/bulk_update_price_quantity"));
    expect(bulk.map((b) => JSON.parse(b.body!).requests.length)).toEqual([25, 5]);
    expect(JSON.parse(bulk[0]!.body!).requests[0].shipToLocationAvailability.quantity).toBe(0);
    await expect(a.pushStock([{ sku: "YOK", available: 1 }])).rejects.toThrow(
      /YOK \(SKU bulunamadı\)/,
    );
  });
});

function fakeShopify(opts: { throttle?: boolean } = {}) {
  const calls: {
    url: string;
    headers: Record<string, string>;
    query: string;
    variables: Record<string, unknown>;
  }[] = [];
  let throttled = false;
  const f = (async (url: string, init: RequestInit) => {
    const { query, variables } = JSON.parse(String(init.body));
    calls.push({ url, headers: lower(init.headers), query, variables });
    if (query.startsWith("query Orders")) {
      if (opts.throttle && !throttled) {
        throttled = true;
        return json(200, { errors: [{ message: "Throttled", extensions: { code: "THROTTLED" } }] });
      }
      const second = variables.after === "C1";
      return json(200, {
        data: {
          orders: {
            pageInfo: { hasNextPage: !second, endCursor: second ? null : "C1" },
            nodes: second
              ? [
                  {
                    id: "gid://shopify/Order/2",
                    name: "#1002",
                    createdAt: "2026-11-25T09:00:00Z",
                    cancelledAt: null,
                    shippingAddress: null,
                    lineItems: { nodes: [] },
                  },
                ]
              : [
                  {
                    id: "gid://shopify/Order/1",
                    name: "#1001",
                    createdAt: "2026-11-25T08:00:00Z",
                    cancelledAt: null,
                    shippingAddress: {
                      name: "Lea Becker",
                      address1: "Weg 5",
                      address2: null,
                      zip: "60311",
                      city: "Frankfurt am Main",
                      countryCodeV2: "DE",
                    },
                    lineItems: {
                      nodes: [
                        {
                          id: "gid://shopify/LineItem/11",
                          sku: "HV-50",
                          quantity: 2,
                          originalUnitPriceSet: { shopMoney: { amount: "19.90" } },
                        },
                        {
                          id: "gid://shopify/LineItem/12",
                          sku: null,
                          quantity: 1,
                          originalUnitPriceSet: { shopMoney: { amount: "5.00" } },
                        },
                      ],
                    },
                  },
                ],
          },
        },
      });
    }
    if (query.startsWith("query FO"))
      return json(200, {
        data: {
          order: {
            fulfillmentOrders: {
              nodes: [
                { id: "gid://shopify/FulfillmentOrder/7", status: "OPEN" },
                { id: "gid://shopify/FulfillmentOrder/8", status: "CLOSED" },
              ],
            },
          },
        },
      });
    if (query.startsWith("mutation F"))
      return json(200, {
        data: { fulfillmentCreate: { fulfillment: { id: "F" }, userErrors: [] } },
      });
    if (query.startsWith("query V")) {
      const sku = JSON.parse(String(variables.q).slice(4));
      return json(200, {
        data: {
          productVariants: {
            nodes:
              sku === "YOK"
                ? []
                : [{ sku, inventoryItem: { id: `gid://shopify/InventoryItem/${sku}` } }],
          },
        },
      });
    }
    if (query.startsWith("mutation S"))
      return json(200, { data: { inventorySetQuantities: { userErrors: [] } } });
    return json(400, {});
  }) as unknown as typeof fetch;
  return { f, calls };
}

const shopCreds = {
  shop: "ornek-magaza.myshopify.com",
  accessToken: `shpat_${"0123456789abcdef".repeat(2)}`,
  locationId: "gid://shopify/Location/42",
};

describe("Shopify (Almanca web mağaza) adaptörü", () => {
  it("ödenmiş, gönderilmemiş siparişleri sayfalı çeker; adressiz ve SKU'suz kalemleri atlar", async () => {
    const { f, calls } = fakeShopify();
    const orders = await shopifyAdapter(shopCreds, {
      fetchImpl: f,
      sleep: noSleep,
      now: NOW,
    }).fetchOrders(null);
    expect(orders).toEqual([
      {
        externalId: "gid://shopify/Order/1",
        orderedAt: new Date("2026-11-25T08:00:00Z"),
        buyer: {
          name: "Lea Becker",
          street: "Weg 5",
          zip: "60311",
          city: "Frankfurt am Main",
          country: "DE",
        },
        lines: [
          {
            externalLineId: "gid://shopify/LineItem/11",
            sku: "HV-50",
            quantity: 2,
            priceCents: 1990,
          },
        ],
      },
    ]);
    expect(calls[0]!.url).toBe(
      `https://ornek-magaza.myshopify.com/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    );
    expect(calls[0]!.headers["x-shopify-access-token"]).toBe(shopCreds.accessToken);
    expect(calls[0]!.variables.q).toBe(
      "created_at:>='2026-11-18T09:50:00.000Z' AND fulfillment_status:unfulfilled AND financial_status:paid",
    );
  });

  it("THROTTLED yanıtında yeniden dener", async () => {
    const { f, calls } = fakeShopify({ throttle: true });
    const orders = await shopifyAdapter(shopCreds, {
      fetchImpl: f,
      sleep: noSleep,
      now: NOW,
    }).fetchOrders(null);
    expect(orders).toHaveLength(1);
    expect(calls.filter((c) => c.query.startsWith("query Orders"))).toHaveLength(3);
  });

  it("gönderim yalnız açık fulfillment order'lar için; stok konuma yazılır, bulunmayan SKU raporlanır", async () => {
    const { f, calls } = fakeShopify();
    const a = shopifyAdapter(shopCreds, { fetchImpl: f, sleep: noSleep });
    await a.pushTracking("gid://shopify/Order/1", "DHL", "00340434161234567890");
    const m = calls.find((c) => c.query.startsWith("mutation F"))!;
    expect(m.variables.f).toEqual({
      lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: "gid://shopify/FulfillmentOrder/7" }],
      trackingInfo: { company: "DHL", number: "00340434161234567890" },
      notifyCustomer: true,
    });
    await expect(
      a.pushStock([
        { sku: "HV-50", available: 4 },
        { sku: "YOK", available: 1 },
      ]),
    ).rejects.toThrow(/YOK/);
    const s = calls.find((c) => c.query.startsWith("mutation S"))!;
    expect((s.variables.input as { quantities: unknown[] }).quantities).toEqual([
      {
        inventoryItemId: "gid://shopify/InventoryItem/HV-50",
        locationId: "gid://shopify/Location/42",
        quantity: 4,
      },
    ]);
  });

  it("geçersiz mağaza alan adını reddeder (SSRF koruması)", () => {
    expect(() => shopifyAdapter({ ...shopCreds, shop: "evil.com/x?.myshopify.com" })).toThrow();
    expect(() => shopifyAdapter({ ...shopCreds, shop: "169.254.169.254" })).toThrow();
  });

  it("webhook imzası doğrulanır", () => {
    const body = '{"id":1}';
    const sig = createHmac("sha256", "whsec").update(body).digest("base64");
    expect(verifyShopifyWebhook(body, sig, "whsec")).toBe(true);
    expect(verifyShopifyWebhook(body + " ", sig, "whsec")).toBe(false);
    expect(verifyShopifyWebhook(body, sig, "baska")).toBe(false);
    expect(verifyShopifyWebhook(body, null, "whsec")).toBe(false);
    expect(verifyShopifyWebhook(body, "kısa", "whsec")).toBe(false);
  });
});

describe("canlı kimlik bilgisi doğrulama ve adaptör seçimi", () => {
  it("biçimleri doğrular, mağaza adresini normalleştirir", () => {
    expect(validateLiveCredentials({ channel: "EBAY", refreshToken: "abc" }).ok).toBe(false);
    expect(
      validateLiveCredentials({ channel: "EBAY", refreshToken: "v^1.1#i^1#r^1#REFRESH0000000000" })
        .ok,
    ).toBe(true);
    const w = validateLiveCredentials({
      channel: "WEBSHOP",
      shop: "https://Ornek-Magaza.myshopify.com/admin",
      accessToken: shopCreds.accessToken,
      locationId: shopCreds.locationId,
    });
    expect(w).toMatchObject({ ok: true, account: "ornek-magaza.myshopify.com" });
    expect(
      validateLiveCredentials({
        channel: "WEBSHOP",
        shop: "ornek.com",
        accessToken: shopCreds.accessToken,
        locationId: shopCreds.locationId,
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateLiveCredentials({ channel: "WEBSHOP", ...shopCreds, accessToken: "shpca_x" }),
    ).toMatchObject({ ok: false });
    expect(
      validateLiveCredentials({
        channel: "AMAZON",
        refreshToken: "Atzr|IwEBIExampleRefreshToken000000",
        sellerId: "A2EXAMPLE123",
      }),
    ).toMatchObject({ ok: true, account: "A2EXAMPLE123" });
  });

  it("sandbox bayrağıyla eBay sandbox uç noktası kullanılır", async () => {
    const { f, calls } = fakeEbay();
    const orig = globalThis.fetch;
    globalThis.fetch = f;
    process.env.INTEGRATIONS_SANDBOX = "1";
    try {
      const a = liveAdapterFor("EBAY", encryptField(JSON.stringify({ refreshToken: "x" })), {
        EBAY_CLIENT_ID: "a",
        EBAY_CLIENT_SECRET: "b",
      } as unknown as NodeJS.ProcessEnv);
      await a.fetchOrders(null);
      expect(calls.every((c) => c.url.startsWith(EBAY_SANDBOX_API))).toBe(true);
    } finally {
      globalThis.fetch = orig;
      delete process.env.INTEGRATIONS_SANDBOX;
    }
  });

  it("uygulama kimliği yoksa açık hata", async () => {
    const a = liveAdapterFor("EBAY", encryptField("{}"), {} as NodeJS.ProcessEnv);
    await expect(a.fetchOrders(null)).rejects.toThrow(/API kimlik bilgileri/);
  });
});
