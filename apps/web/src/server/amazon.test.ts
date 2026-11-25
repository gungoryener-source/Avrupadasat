import { encryptField } from "@avrupadasat/db/crypto";
import { afterAll, describe, expect, it } from "vitest";
import { amazonAdapter, LWA_URL, MARKETPLACE_DE, SPAPI_EU } from "./amazon";
import { db } from "./db";
import { connectAmazonLive, shipOrder, syncOrders } from "./orders";

type Call = { url: string; method: string; headers: Record<string, string>; body?: string };

/** SP-API belgelerindeki yanıt yapısına göre sahte sunucu */
function fakeSpApi(opts: { throttleOnce?: boolean } = {}) {
  const calls: Call[] = [];
  let throttled = false;
  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers });
  const f = (async (url: string, init: RequestInit) => {
    const headers = Object.fromEntries(
      Object.entries((init.headers ?? {}) as Record<string, string>).map(([k, v]) => [
        k.toLowerCase(),
        v,
      ]),
    );
    calls.push({
      url,
      method: init.method ?? "GET",
      headers,
      body: init.body ? String(init.body) : undefined,
    });
    if (url === LWA_URL)
      return json(200, { access_token: "Atza|ACCESS", token_type: "bearer", expires_in: 3600 });
    const u = new URL(url);
    if (u.pathname === "/tokens/2021-03-01/restrictedDataToken")
      return json(200, { restrictedDataToken: "Atz.sprdt|RDT", expiresIn: 3600 });
    if (u.pathname === "/orders/v0/orders" && !u.searchParams.get("NextToken")) {
      if (opts.throttleOnce && !throttled) {
        throttled = true;
        return json(
          429,
          { errors: [{ code: "QuotaExceeded", message: "You exceeded your quota" }] },
          { "retry-after": "1" },
        );
      }
      return json(200, {
        payload: {
          Orders: [
            {
              AmazonOrderId: "302-1111111-1111111",
              PurchaseDate: "2026-11-25T08:00:00Z",
              OrderStatus: "Unshipped",
              FulfillmentChannel: "MFN",
              ShippingAddress: {
                Name: "Anna Schmidt",
                AddressLine1: "Musterstraße 1",
                PostalCode: "10115",
                City: "Berlin",
                CountryCode: "DE",
              },
            },
            {
              AmazonOrderId: "302-9999999-9999999",
              PurchaseDate: "2026-11-25T08:05:00Z",
              OrderStatus: "Unshipped",
              FulfillmentChannel: "AFN",
            },
          ],
          NextToken: "SAYFA2",
        },
      });
    }
    if (u.pathname === "/orders/v0/orders" && u.searchParams.get("NextToken") === "SAYFA2") {
      return json(200, {
        payload: {
          Orders: [
            {
              AmazonOrderId: "302-2222222-2222222",
              PurchaseDate: "2026-11-25T09:00:00Z",
              OrderStatus: "Unshipped",
              FulfillmentChannel: "MFN",
              ShippingAddress: {
                Name: "Lukas Weber",
                AddressLine1: "Hauptstr. 2",
                AddressLine2: "3. OG",
                PostalCode: "50667",
                City: "Köln",
                CountryCode: "DE",
              },
            },
          ],
        },
      });
    }
    const items = /^\/orders\/v0\/orders\/([^/]+)\/orderItems$/.exec(u.pathname);
    if (items) {
      const id = decodeURIComponent(items[1]!);
      return json(200, {
        payload: {
          AmazonOrderId: id,
          OrderItems: id.startsWith("302-1")
            ? [
                {
                  OrderItemId: "OI-1",
                  SellerSKU: "HV-50",
                  QuantityOrdered: 2,
                  ItemPrice: { Amount: "39.80", CurrencyCode: "EUR" },
                },
              ]
            : [
                {
                  OrderItemId: "OI-2",
                  SellerSKU: "HV-70",
                  QuantityOrdered: 1,
                  ItemPrice: { Amount: "24.90", CurrencyCode: "EUR" },
                },
              ],
        },
      });
    }
    if (/\/shipment\/confirm$/.test(u.pathname)) return new Response(null, { status: 204 });
    if (u.pathname.startsWith("/listings/2021-08-01/items/"))
      return json(200, { sku: "HV-50", status: "ACCEPTED", submissionId: "s1", issues: [] });
    return json(404, { errors: [{ message: "bilinmeyen uç nokta" }] });
  }) as unknown as typeof fetch;
  return { f, calls };
}

const app = (f: typeof fetch) => ({
  clientId: "amzn1.application-oa2-client.x",
  clientSecret: "s",
  fetchImpl: f,
  sleep: async () => undefined,
  now: () => Date.parse("2026-11-25T10:00:00Z"),
});
const creds = { refreshToken: "Atzr|IwEBIExampleRefreshToken000000", sellerId: "A2EXAMPLE123" };

describe("Amazon SP-API adaptörü", () => {
  it("siparişleri sayfalayarak çeker; adres RDT ile; FBA (AFN) siparişleri atlanır; birim fiyat hesaplanır", async () => {
    const { f, calls } = fakeSpApi();
    const orders = await amazonAdapter(creds, app(f)).fetchOrders(new Date("2026-11-25T07:00:00Z"));
    expect(orders.map((o) => o.externalId)).toEqual(["302-1111111-1111111", "302-2222222-2222222"]);
    expect(orders[0]).toMatchObject({
      buyer: { name: "Anna Schmidt", zip: "10115", city: "Berlin" },
      lines: [{ externalLineId: "OI-1", sku: "HV-50", quantity: 2, priceCents: 1990 }],
    });
    expect(orders[1]!.buyer.street).toBe("Hauptstr. 2, 3. OG");
    const lwa = calls.filter((c) => c.url === LWA_URL);
    expect(lwa).toHaveLength(1); // token önbellekte
    expect(lwa[0]!.body).toContain("grant_type=refresh_token");
    const list = calls.filter((c) => c.url.startsWith(`${SPAPI_EU}/orders/v0/orders?`));
    expect(list.every((c) => c.headers["x-amz-access-token"] === "Atz.sprdt|RDT")).toBe(true);
    const first = new URL(list[0]!.url);
    expect(first.searchParams.get("MarketplaceIds")).toBe(MARKETPLACE_DE);
    expect(first.searchParams.get("CreatedAfter")).toBe("2026-11-25T06:50:00.000Z"); // 10 dk tampon
    const items = calls.filter((c) => c.url.includes("/orderItems"));
    expect(items.every((c) => c.headers["x-amz-access-token"] === "Atza|ACCESS")).toBe(true);
    expect(items.some((c) => c.url.includes("9999999"))).toBe(false);
  });

  it("429'da Retry-After kadar bekleyip yeniden dener", async () => {
    const { f, calls } = fakeSpApi({ throttleOnce: true });
    const waits: number[] = [];
    const orders = await amazonAdapter(creds, {
      ...app(f),
      sleep: async (ms) => void waits.push(ms),
    }).fetchOrders(null);
    expect(orders).toHaveLength(2);
    expect(waits).toEqual([1000]);
    expect(
      calls.filter(
        (c) => c.url.startsWith(`${SPAPI_EU}/orders/v0/orders?`) && !c.url.includes("NextToken"),
      ).length,
    ).toBe(2);
  });

  it("kargo onayı: kalem kimlikleriyle; kimlik yoksa hata", async () => {
    const { f, calls } = fakeSpApi();
    const a = amazonAdapter(creds, app(f));
    await a.pushTracking("302-1111111-1111111", "DHL", "00340434161234567890", [
      { externalLineId: "OI-1", quantity: 2 },
    ]);
    const c = calls.find((x) => x.url.endsWith("/shipment/confirm"))!;
    expect(c.method).toBe("POST");
    expect(JSON.parse(c.body!)).toMatchObject({
      marketplaceId: MARKETPLACE_DE,
      packageDetail: {
        carrierCode: "DHL",
        trackingNumber: "00340434161234567890",
        orderItems: [{ orderItemId: "OI-1", quantity: 2 }],
      },
    });
    await expect(
      a.pushTracking("x", "DHL", "1", [{ externalLineId: null, quantity: 1 }]),
    ).rejects.toThrow(/kalem kimlik/);
  });

  it("stok güncelleme: Listings API PATCH, negatif stok 0", async () => {
    const { f, calls } = fakeSpApi();
    await amazonAdapter(creds, app(f)).pushStock([{ sku: "HV 50/A", available: -3 }]);
    const c = calls.find((x) => x.method === "PATCH")!;
    expect(c.url).toBe(
      `${SPAPI_EU}/listings/2021-08-01/items/A2EXAMPLE123/HV%2050%2FA?marketplaceIds=${MARKETPLACE_DE}`,
    );
    expect(JSON.parse(c.body!).patches[0].value[0].quantity).toBe(0);
  });

  it("API hatası anlamlı mesajla döner", async () => {
    const f = (async (url: string) =>
      url === LWA_URL
        ? new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })
        : new Response("{}")) as unknown as typeof fetch;
    await expect(amazonAdapter(creds, app(f)).fetchOrders(null)).rejects.toThrow(
      /yetkilendirmesi başarısız/,
    );
  });
});

const run = `amz${Date.now()}`;
let T: string;

describe.skipIf(!process.env.DATABASE_URL)("canlı Amazon akışı (sahte SP-API ile)", () => {
  afterAll(async () => {
    await db().stockMovement.deleteMany({ where: { tenantId: T } });
    await db().workOrder.deleteMany({ where: { tenantId: T } });
    await db().tenant.delete({ where: { id: T } });
  });

  it("kimlik bilgisi şifreli saklanır; siparişler kalem kimliğiyle içe aktarılır; kargo onayı Amazon'a gider", async () => {
    T = (await db().tenant.create({ data: { name: "Amz", slug: run, status: "ACTIVE" } })).id;
    await db().stockItem.createMany({
      data: [
        { tenantId: T, sku: "HV-50", name: "A", quantity: 10 },
        { tenantId: T, sku: "HV-70", name: "B", quantity: 10 },
      ],
    });
    expect(
      await connectAmazonLive(T, { refreshToken: "yanlis", sellerId: "x" }, "u"),
    ).toMatchObject({ ok: false });
    expect(await connectAmazonLive(T, creds, "u")).toEqual({ ok: true });
    const conn = await db().marketplaceConnection.findFirstOrThrow({ where: { tenantId: T } });
    expect(conn.mode).toBe("live");
    expect(conn.credentialsEnc).not.toContain("Atzr");
    const { f, calls } = fakeSpApi();
    const adapter = amazonAdapter(creds, app(f));
    expect(await syncOrders(T, "AMAZON", adapter)).toEqual({ ok: true, imported: 2, held: 0 });
    const o = await db().order.findFirstOrThrow({
      where: { tenantId: T, externalId: "302-1111111-1111111" },
      include: { lines: true },
    });
    expect(o.lines[0]).toMatchObject({
      externalLineId: "OI-1",
      sku: "HV-50",
      quantity: 2,
      priceCents: 1990,
    });
    expect(await shipOrder(T, o.id, "DHL", "00340434161234567890", "u", adapter)).toEqual({
      ok: true,
    });
    expect(
      calls.some((c) => c.url.endsWith("/orders/v0/orders/302-1111111-1111111/shipment/confirm")),
    ).toBe(true);
  });

  it("anahtarsız canlı mod: kimlik bilgisi olmasa da açık hata, sessiz başarı yok", async () => {
    const enc = encryptField(JSON.stringify(creds));
    expect(enc.startsWith("v")).toBe(true);
    delete process.env.AMAZON_SP_API_CLIENT_ID;
    const r = await syncOrders(T, "AMAZON");
    expect(r).toMatchObject({ ok: false, reason: expect.stringMatching(/kimlik bilgileri/) });
  });
});
