import { afterAll, describe, expect, it } from "vitest";
import { db } from "./db";
import { slaSummary } from "./sla";

const run = `sla${Date.now()}`;
let T: string;

describe.skipIf(!process.env.DATABASE_URL)("SLA özeti", () => {
  afterAll(async () => {
    await db().returnItem.deleteMany({ where: { tenantId: T } });
    await db().orderLine.deleteMany({ where: { order: { tenantId: T } } });
    await db().order.deleteMany({ where: { tenantId: T } });
    await db().shipmentEvent.deleteMany({ where: { shipment: { tenantId: T } } });
    await db().shipment.deleteMany({ where: { tenantId: T } });
    await db().tenant.delete({ where: { id: T } });
  });

  it("mal kabul, zamanında gönderim ve iade süreleri iş günüyle ölçülür", async () => {
    T = (await db().tenant.create({ data: { name: "SLA", slug: run, status: "ACTIVE" } })).id;
    const at = (s: string) => new Date(s);
    // Mal kabul: Cuma gümrük → Pazartesi kabul = 1 iş günü (hedefte); Pzt gümrük → Perş kabul = 3 (dışında)
    for (const [ref, customs, recv] of [
      ["S1", "2026-11-20T10:00:00Z", "2026-11-23T10:00:00Z"],
      ["S2", "2026-11-16T10:00:00Z", "2026-11-19T10:00:00Z"],
    ] as const) {
      await db().shipment.create({
        data: {
          tenantId: T,
          reference: `${run}-${ref}`,
          stage: "DEPO_KABUL",
          receivedAt: at(recv),
          events: {
            create: [
              { tenantId: T, stage: "GUMRUK", at: at(customs) },
              { tenantId: T, stage: "DEPO_KABUL", at: at(recv) },
            ],
          },
        },
      });
    }
    // Siparişler: kesimden önce + aynı gün (zamanında), kesimden sonra + ertesi iş günü (zamanında),
    // kesimden önce + 2 gün sonra (geç), iptal (sayılmaz)
    const order = (id: string, orderedAt: string, shippedAt: string | null, status = "SHIPPED") =>
      db().order.create({
        data: {
          tenantId: T,
          channel: "AMAZON",
          externalId: `${run}-${id}`,
          status: status as never,
          orderedAt: at(orderedAt),
          shippedAt: shippedAt ? at(shippedAt) : null,
          itemsCents: 1000,
          shipToEnc: "x",
        } as never,
      });
    await order("o1", "2026-11-24T08:00:00Z", "2026-11-24T15:00:00Z");
    await order("o2", "2026-11-24T14:00:00Z", "2026-11-25T09:00:00Z");
    await order("o3", "2026-11-23T08:00:00Z", "2026-11-25T09:00:00Z");
    await order("o4", "2026-11-23T08:00:00Z", "2026-11-25T09:00:00Z", "CANCELLED");
    // İadeler: 2 iş günü (hedefte), 5 iş günü (dışında)
    for (const [c, p] of [
      ["2026-11-16T09:00:00Z", "2026-11-18T09:00:00Z"],
      ["2026-11-16T09:00:00Z", "2026-11-23T09:00:00Z"],
    ] as const) {
      await db().returnItem.create({
        data: {
          tenantId: T,
          sku: "A",
          quantity: 1,
          condition: "SELLABLE",
          status: "PROCESSED",
          createdAt: at(c),
          processedAt: at(p),
        } as never,
      });
    }

    const s = await slaSummary(T, 30, at("2026-11-26T12:00:00Z"));
    expect(s.inbound).toEqual({ count: 2, met: 1, avgDays: 2, pct: 50 });
    expect(s.onTimeShipping).toMatchObject({ count: 3, met: 2, pct: 66.7 });
    expect(s.returns).toEqual({ count: 2, met: 1, avgDays: 3.5, pct: 50 });

    const empty = await slaSummary(T, 30, at("2027-06-01T12:00:00Z"));
    expect(empty.inbound).toEqual({ count: 0, met: 0, avgDays: null, pct: null });
  });
});
