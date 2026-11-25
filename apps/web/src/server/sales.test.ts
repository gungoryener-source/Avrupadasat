import { encryptField } from "@avrupadasat/db/crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./db";
import { salesSummary } from "./panel";

const run = `s${Date.now()}`;
let T: string;
const now = new Date("2026-11-25T12:00:00Z");
const day = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe.skipIf(!process.env.DATABASE_URL)("ciro özeti", () => {
  beforeAll(async () => {
    T = (await db().tenant.create({ data: { name: "Ciro", slug: `${run}` } })).id;
    const ship = encryptField("{}");
    const mk = (
      externalId: string,
      channel: "AMAZON" | "EBAY",
      cents: number,
      at: Date,
      status: "SHIPPED" | "CANCELLED" = "SHIPPED",
    ) =>
      db().order.create({
        data: {
          tenantId: T,
          channel,
          externalId,
          status,
          shipToEnc: ship,
          itemsCents: cents,
          orderedAt: at,
        },
      });
    await mk("a1", "AMAZON", 10_000, day(1));
    await mk("a2", "AMAZON", 5_000, day(10));
    await mk("e1", "EBAY", 2_500, day(3));
    await mk("c1", "AMAZON", 99_999, day(2), "CANCELLED");
    await mk("old", "AMAZON", 10_000, day(45));
  });
  afterAll(() => db().tenant.delete({ where: { id: T } }));

  it("son 30 gün, iptaller hariç, kanala göre; önceki döneme göre değişim", async () => {
    const s = await salesSummary(T, 30, now);
    expect(s).toMatchObject({
      revenueCents: 17_500,
      orders: 3,
      prevRevenueCents: 10_000,
      changePct: 75,
    });
    expect(s.byChannel).toEqual([
      { channel: "AMAZON", revenueCents: 15_000, orders: 2 },
      { channel: "EBAY", revenueCents: 2_500, orders: 1 },
    ]);
  });

  it("önceki dönemde (iptal dışı) satış yoksa değişim null", async () => {
    // 1 günlük pencere: önceki gündeki tek sipariş iptal edilmiş
    const s = await salesSummary(T, 1, now);
    expect(s).toMatchObject({ revenueCents: 10_000, prevRevenueCents: 0, changePct: null });
  });
});
