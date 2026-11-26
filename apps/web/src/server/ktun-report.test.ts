import { afterAll, describe, expect, it } from "vitest";
import { db } from "./db";
import { isValidGtin, ktunMonthlyReport, ktunReportCsv } from "./ktun-report";

describe("GTIN doğrulama", () => {
  it("kontrol hanesini doğrular", () => {
    expect(isValidGtin("4006381333931")).toBe(true); // EAN-13
    expect(isValidGtin("4006381333932")).toBe(false);
    expect(isValidGtin("96385074")).toBe(true); // EAN-8
    expect(isValidGtin("12345")).toBe(false);
    expect(isValidGtin(null)).toBe(false);
    expect(isValidGtin("40063813339a1")).toBe(false);
  });
});

const run = `ktun${Date.now()}`;
let T: string;
let OTHER: string;

describe.skipIf(!process.env.DATABASE_URL)("KTÜN aylık raporu", () => {
  afterAll(async () => {
    for (const id of [T, OTHER].filter(Boolean)) {
      await db().stockMovement.deleteMany({ where: { tenantId: id } });
      await db().invoice.deleteMany({ where: { tenantId: id } });
      await db().stockItem.deleteMany({ where: { tenantId: id } });
      await db().tenant.delete({ where: { id } });
    }
  });

  it("dönem başı/sonu stok defterden geriye doğru, hareketler türüne göre, giderler 15/4 ayrımıyla", async () => {
    T = (await db().tenant.create({ data: { name: "KTÜN Tekstil", slug: run, status: "ACTIVE" } }))
      .id;
    OTHER = (
      await db().tenant.create({ data: { name: "Başka", slug: `${run}-b`, status: "ACTIVE" } })
    ).id;
    // Güncel stok: A=30, B=5 (barkodsuz), C=0 ve hiç hareket yok (rapora girmez)
    await db().stockItem.createMany({
      data: [
        { tenantId: T, sku: "A", name: "Havlu", ean: "4006381333931", quantity: 30 },
        { tenantId: T, sku: "B", name: "Bornoz", ean: null, quantity: 5 },
        { tenantId: T, sku: "C", name: "Eski", ean: "96385074", quantity: 0 },
        { tenantId: OTHER, sku: "A", name: "Başka firmanın", ean: "4006381333931", quantity: 999 },
      ],
    });
    const at = (iso: string) => new Date(iso);
    await db().stockMovement.createMany({
      data: [
        // Ekim 2026 (rapor dönemi)
        {
          tenantId: T,
          sku: "A",
          delta: 50,
          reason: "RECEIVE",
          createdAt: at("2026-10-02T08:00:00Z"),
        },
        {
          tenantId: T,
          sku: "A",
          delta: -2,
          reason: "ORDER",
          refId: "o1",
          createdAt: at("2026-10-05T08:00:00Z"),
        },
        {
          tenantId: T,
          sku: "A",
          delta: -3,
          reason: "ORDER",
          refId: "o2",
          createdAt: at("2026-10-06T08:00:00Z"),
        },
        {
          tenantId: T,
          sku: "A",
          delta: -1,
          reason: "ORDER",
          refId: "o2",
          createdAt: at("2026-10-06T08:00:00Z"),
        },
        {
          tenantId: T,
          sku: "A",
          delta: 1,
          reason: "RETURN",
          createdAt: at("2026-10-20T08:00:00Z"),
        },
        {
          tenantId: T,
          sku: "A",
          delta: -1,
          reason: "DAMAGE",
          createdAt: at("2026-10-21T08:00:00Z"),
        },
        {
          tenantId: T,
          sku: "B",
          delta: 5,
          reason: "RECEIVE",
          createdAt: at("2026-10-03T08:00:00Z"),
        },
        // Kasım 2026 (dönem sonrası): A için -14
        {
          tenantId: T,
          sku: "A",
          delta: -14,
          reason: "ORDER",
          refId: "o9",
          createdAt: at("2026-11-03T08:00:00Z"),
        },
        // Başka firmanın hareketi rapora karışmamalı
        {
          tenantId: OTHER,
          sku: "A",
          delta: -500,
          reason: "ORDER",
          refId: "x",
          createdAt: at("2026-10-10T08:00:00Z"),
        },
      ],
    });
    await db().invoice.create({
      data: {
        tenantId: T,
        number: `${run}-F1`,
        period: "2026-10",
        status: "ISSUED",
        lines: [
          { code: "SUB", description: "Paket", quantity: 1, unitCents: 49_900, totalCents: 49_900 },
          {
            code: "STORAGE",
            description: "Depolama",
            quantity: 2,
            unitCents: 1_300,
            totalCents: 2_600,
          },
          {
            code: "INBOUND",
            description: "Mal kabul",
            quantity: 4,
            unitCents: 250,
            totalCents: 1_000,
          },
          { code: "PICKPACK", description: "Pick", quantity: 2, unitCents: 210, totalCents: 420 },
          { code: "RETURNS", description: "İade", quantity: 1, unitCents: 400, totalCents: 400 },
        ],
        netCents: 54_320,
        vatRatePct: 19,
        vatCents: 10_321,
        grossCents: 64_641,
      },
    });

    const r = await ktunMonthlyReport(T, "2026-10");
    expect(r.rows.map((x) => x.sku)).toEqual(["A", "B"]);
    const a = r.rows[0]!;
    // Dönem sonu = 30 - (-14) = 44; dönem başı = 30 - (50-2-3-1+1-1-14) = 0
    expect(a).toMatchObject({
      ktun: "4006381333931",
      opening: 0,
      received: 50,
      shipped: 6,
      returned: 1,
      damaged: 1,
      adjusted: 0,
      closing: 44,
      ordersFulfilled: 2,
    });
    expect(a.opening + a.received - a.shipped + a.returned - a.damaged + a.adjusted).toBe(
      a.closing,
    );
    expect(r.rows[1]).toMatchObject({ sku: "B", opening: 0, received: 5, closing: 5 });
    expect(r.missingKtun).toEqual(["B"]);
    expect(r.fees).toEqual({
      invoiceNumber: `${run}-F1`,
      fulfillmentCents: 820,
      storageCents: 2_600,
      otherCents: 50_900,
    });

    const csv = ktunReportCsv(r);
    expect(csv).toContain("4006381333931;evet;A;Havlu;0;50;6;1;1;0;44;2");
    expect(csv).toContain(";hayır;B;");
    expect(csv).toContain("Sipariş karşılama giderleri (pick & pack, iade kabulü) — net €;8,20");
    expect(csv).not.toContain("Başka firmanın");

    const empty = await ktunMonthlyReport(T, "2026-09");
    expect(empty.fees).toBeNull();
    expect(ktunReportCsv(empty)).toContain("fatura henüz oluşturulmadı");
  });
});
