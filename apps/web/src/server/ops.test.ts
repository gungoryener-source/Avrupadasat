import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { draftInvoice, issueInvoice, markPaid, snapshotStorage, usageFor } from "./billing";
import { db } from "./db";
import { mockAdapter } from "./marketplace";
import {
  cancelOrder,
  connectChannel,
  processReturn,
  registerReturn,
  retryHeld,
  shipOrder,
  shipTo,
  syncOrders,
} from "./orders";
import { scorecards } from "./scorecard";

const run = `p4${Date.now()}`;
let T: string;
let actor: string;

describe.skipIf(!process.env.DATABASE_URL)("operasyon: sipariş, iade, fatura", () => {
  beforeAll(async () => {
    T = (
      await db().tenant.create({
        data: {
          name: "Ops",
          slug: `${run}-t`,
          packageCode: "PAZARA_GIRIS",
          status: "ACTIVE",
          palletsInUse: 6,
        },
      })
    ).id;
    actor = (
      await db().user.create({ data: { email: `${run}@ops.test`, name: "Ops", staffRole: "OPS" } })
    ).id;
    await db().registrationTask.createMany({
      data: [
        { tenantId: T, step: "VERGI_NO", status: "SURUYOR" },
        { tenantId: T, step: "UST_ID", status: "TAMAM" },
      ],
    });
    await db().stockItem.createMany({
      data: [
        { tenantId: T, sku: "A", name: "Ürün A", quantity: 3 },
        { tenantId: T, sku: "B", name: "Ürün B", quantity: 50 },
      ],
    });
  });
  afterAll(async () => {
    await db().stockMovement.deleteMany({ where: { tenantId: T } });
    await db().storageSnapshot.deleteMany({ where: { tenantId: T } });
    await db().disbursement.deleteMany({ where: { tenantId: T } });
    await db().workOrder.deleteMany({ where: { tenantId: T } });
    await db().returnItem.deleteMany({ where: { tenantId: T } });
    await db().tenant.delete({ where: { id: T } });
    await db().user.delete({ where: { id: actor } });
  });

  it("satış kilidi: vergi numarası gelmeden kanal bağlanamaz", async () => {
    expect(await connectChannel(T, "AMAZON", actor)).toMatchObject({ ok: false });
    await db().registrationTask.updateMany({ where: { tenantId: T }, data: { status: "TAMAM" } });
    expect(await connectChannel(T, "AMAZON", actor)).toEqual({ ok: true });
  });

  it("sipariş içe aktarma: rezervasyon, yetersiz stokta bekletme, tekrar içe aktarmada çift kayıt yok; adres şifreli", async () => {
    const ad = {
      ...mockAdapter("AMAZON", []),
      fetchOrders: async () => [
        {
          externalId: "X1",
          orderedAt: new Date(),
          buyer: {
            name: "Anna Schmidt",
            street: "Musterstraße 1",
            zip: "10115",
            city: "Berlin",
            country: "DE",
          },
          lines: [{ sku: "A", quantity: 2, priceCents: 1990 }],
        },
        {
          externalId: "X2",
          orderedAt: new Date(),
          buyer: {
            name: "Lukas Weber",
            street: "Hauptstraße 2",
            zip: "50667",
            city: "Köln",
            country: "DE",
          },
          lines: [
            { sku: "A", quantity: 2, priceCents: 1990 },
            { sku: "B", quantity: 1, priceCents: 990 },
          ],
        },
      ],
    };
    expect(await syncOrders(T, "AMAZON", ad)).toEqual({ ok: true, imported: 2, held: 1 });
    expect(await syncOrders(T, "AMAZON", ad)).toEqual({ ok: true, imported: 0, held: 0 });
    const a = await db().stockItem.findUniqueOrThrow({
      where: { tenantId_sku: { tenantId: T, sku: "A" } },
    });
    const b = await db().stockItem.findUniqueOrThrow({
      where: { tenantId_sku: { tenantId: T, sku: "B" } },
    });
    expect([a.reserved, b.reserved]).toEqual([2, 0]); // X2 bekletildi, B için kısmi rezervasyon geri alındı
    const held = await db().order.findFirstOrThrow({ where: { tenantId: T, externalId: "X2" } });
    expect(held).toMatchObject({ status: "ON_HOLD", holdReason: "Yetersiz stok" });
    expect(held.shipToEnc).not.toContain("Weber");
    expect(shipTo(held.shipToEnc).city).toBe("Köln");
    expect(await retryHeld(T, held.id)).toMatchObject({ ok: false });
  });

  it("kargo: stok ve rezervasyon düşer, iş emri kapanır, takip pazaryerine gider; tekrar kargolanamaz", async () => {
    const o = await db().order.findFirstOrThrow({ where: { tenantId: T, externalId: "X1" } });
    const calls: string[] = [];
    const ad = {
      ...mockAdapter("AMAZON", []),
      pushTracking: async (id: string, c: string, n: string) => void calls.push(`${id}:${c}:${n}`),
    };
    expect(await shipOrder(T, o.id, "DHL", "x", actor, ad)).toMatchObject({ ok: false });
    expect(await shipOrder(T, o.id, "DHL", "00340434161234567890", actor, ad)).toEqual({
      ok: true,
    });
    expect(calls).toEqual(["X1:DHL:00340434161234567890"]);
    const a = await db().stockItem.findUniqueOrThrow({
      where: { tenantId_sku: { tenantId: T, sku: "A" } },
    });
    expect([a.quantity, a.reserved]).toEqual([1, 0]);
    expect(await db().workOrder.count({ where: { orderId: o.id, status: "DONE" } })).toBe(1);
    expect(await shipOrder(T, o.id, "DHL", "00340434161234567890", actor, ad)).toMatchObject({
      ok: false,
    });
    expect(await cancelOrder(T, o.id, actor)).toMatchObject({ ok: false });
  });

  it("iade: satılabilir stoğa döner, hasarlı dönmez; iki kez işlenmez", async () => {
    const o = await db().order.findFirstOrThrow({ where: { tenantId: T, externalId: "X1" } });
    const r1 = await registerReturn(
      T,
      { orderId: o.id, sku: "A", quantity: 1, reason: "Beğenmedi" },
      actor,
    );
    const r2 = await registerReturn(
      T,
      { orderId: o.id, sku: "A", quantity: 1, reason: "Kırık" },
      actor,
    );
    expect(await registerReturn(T, { sku: "YOK", quantity: 1 }, actor)).toMatchObject({
      ok: false,
    });
    if (!r1.ok || !r2.ok) throw new Error("iade");
    expect(await processReturn(T, r1.id, "SELLABLE", actor)).toEqual({ ok: true });
    expect(await processReturn(T, r2.id, "DAMAGED", actor)).toEqual({ ok: true });
    expect(await processReturn(T, r1.id, "SELLABLE", actor)).toMatchObject({ ok: false });
    const a = await db().stockItem.findUniqueOrThrow({
      where: { tenantId_sku: { tenantId: T, sku: "A" } },
    });
    expect(a.quantity).toBe(2);
  });

  it("fatura: anlık görüntü, taslak, kesme (numara, masraf bağlama), ödeme; kesilen fatura değişmez", async () => {
    await snapshotStorage(new Date());
    const period = new Date().toISOString().slice(0, 7);
    await db().disbursement.create({
      data: {
        tenantId: T,
        description: "DHL kargo Kasım",
        amountCents: 12_345,
        incurredAt: new Date(),
      },
    });
    const u = await usageFor(T, period);
    expect(u.usage).toMatchObject({ avgPallets: 6, ordersShipped: 1, returnsProcessed: 2 });
    const draft = await draftInvoice(T, period, actor);
    expect(draft.status).toBe("DRAFT");
    const lines = draft.lines as { code: string; totalCents: number }[];
    expect(lines.map((l) => l.code)).toEqual(["SUB", "STORAGE", "PICKPACK", "RETURNS", "DISB"]);
    expect(draft.netCents).toBe(49_900 + 6 * 1_300 + 210 + 2 * 400 + 12_345);
    expect(draft.vatCents).toBe(Math.round(draft.netCents * 0.19));
    const issued = await issueInvoice(draft.id, actor);
    expect(issued.number).toMatch(/^AS-R-\d{4}-\d{5}$/);
    await expect(issueInvoice(draft.id, actor)).rejects.toThrow();
    expect(await db().disbursement.count({ where: { tenantId: T, invoiceId: draft.id } })).toBe(1);
    const again = await draftInvoice(T, period, actor);
    expect(again.status).toBe("ISSUED");
    expect((await markPaid(draft.id, actor)).status).toBe("PAID");
  });

  it("partner skor kartı hesaplanır", async () => {
    const p = await db().user.create({
      data: {
        email: `${run}-p@ops.test`,
        name: "Depo X",
        staffRole: "PARTNER",
        partnerOf: { create: { tenantId: T } },
      },
    });
    const from = new Date(Date.now() - 86_400_000);
    const s = (await scorecards(from, new Date(Date.now() + 86_400_000))).find(
      (x) => x.partnerId === p.id,
    )!;
    expect(s).toMatchObject({ tenants: 1, ordersShipped: 1, onTimeShipPct: 100 });
    expect(s.avgReturnDays).not.toBeNull();
    await db().user.delete({ where: { id: p.id } });
  });
});
