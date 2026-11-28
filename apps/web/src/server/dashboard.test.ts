import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { encryptField } from "@avrupadasat/db/crypto";
import {
  activeShipments,
  kpis,
  pctChange,
  recentOrders,
  salesSeries,
  stockHealth,
} from "./dashboard";
import { db } from "./db";

const run = `db${Date.now().toString(36)}`;
const NOW = new Date("2026-11-27T12:00:00Z");
const D = 86_400_000;
let T: string, O: string;

async function order(
  tenantId: string,
  ext: string,
  daysAgo: number,
  cents: number,
  channel = "AMAZON",
  status = "SHIPPED",
) {
  return db().order.create({
    data: {
      tenantId,
      channel,
      externalId: `${run}-${ext}`,
      status,
      itemsCents: cents,
      orderedAt: new Date(NOW.getTime() - daysAgo * D),
      shipToEnc: encryptField(
        JSON.stringify({ name: "Gizli Alıcı", street: "X 1", zip: "10115", city: "Berlin" }),
      ),
      lines: { create: [{ tenantId, sku: "P1", quantity: 2 }] },
    } as never,
  });
}

describe.skipIf(!process.env.DATABASE_URL)("genel bakış verileri", () => {
  beforeAll(async () => {
    T = (await db().tenant.create({ data: { name: "Dash", slug: `${run}-t` } })).id;
    O = (await db().tenant.create({ data: { name: "Dash2", slug: `${run}-o` } })).id;
    await db().stockItem.createMany({
      data: [
        { tenantId: T, sku: "P1", name: "Havlu", quantity: 40, reserved: 5, lowStockAt: 50 },
        { tenantId: T, sku: "P2", name: "Bornoz", quantity: 200 },
      ],
    });
    await order(T, "a", 1, 10_000);
    await order(T, "b", 3, 5_000, "EBAY");
    await order(T, "c", 40, 7_500); // önceki dönem
    await order(T, "x", 2, 99_999, "AMAZON", "CANCELLED"); // hariç
    await order(O, "o", 1, 123_456); // başka firma
    await db().shipment.create({
      data: {
        tenantId: T,
        reference: `${run}-S`,
        stage: "GUMRUK",
        expectedAt: new Date(NOW.getTime() + 3 * D),
      },
    });
  });
  afterAll(async () => {
    await db().tenant.deleteMany({ where: { id: { in: [T, O] } } });
  });

  it("yüzde değişim: önceki 0 iken tanımsız, eşitse 0", () => {
    expect(pctChange(10, 0)).toBeNull();
    expect(pctChange(0, 0)).toBe(0);
    expect(pctChange(150, 100)).toBe(50);
  });

  it("ciro serisi: günlük kova, kanal kırılımı, önceki dönem; iptal ve başka firma hariç", async () => {
    const s = await salesSeries(T, 30, NOW);
    expect(s.buckets).toHaveLength(30);
    expect(s.revenue).toBe(15_000);
    expect(s.orders).toBe(2);
    expect(s.prevRevenue).toBe(7_500);
    expect(s.revenueChange).toBe(100);
    expect(s.channels).toEqual(["AMAZON", "EBAY"]);
    expect(s.buckets.reduce((a, b) => a + b.byChannel.EBAY, 0)).toBe(5_000);
  });

  it("KPI: stok adedi ve SKU, yoldaki sevkiyat", async () => {
    const k = await kpis(T, NOW);
    expect(k.stock).toMatchObject({ units: 240, skus: 2 });
    expect(k.stock.line).toHaveLength(30);
    expect(k.transit.value).toBe(1);
  });

  it("son siparişler: şehir çözülür, alıcı adı dönmez", async () => {
    const r = await recentOrders(T, 10);
    expect(r[0]?.city).toBe("Berlin");
    expect(JSON.stringify(r)).not.toContain("Gizli Alıcı");
    expect(r.every((x) => x.externalId.startsWith(run))).toBe(true);
    expect(r.some((x) => x.externalId.endsWith("-o"))).toBe(false);
  });

  it("sevkiyat zaman çizelgesi: gümrükteki sevkiyatta sıradaki adım depo kabul", async () => {
    const [s] = await activeShipments(T);
    expect(s?.steps.map((x) => x.done)).toEqual([true, true, true, false, false]);
    expect(s?.steps.find((x) => x.current)?.key).toBe("DEPO_KABUL");
  });

  it("stok sağlığı: eşik altı ürün başta", async () => {
    const h = await stockHealth(T);
    expect(h.lowCount).toBe(1);
    expect(h.rows[0]).toMatchObject({ sku: "P1", available: 35, low: true });
  });
});
