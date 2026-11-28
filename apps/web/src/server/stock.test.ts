import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { can, type Actor } from "@avrupadasat/core/roles";
import { encryptField } from "@avrupadasat/db/crypto";
import { db } from "./db";
import { listDocuments, uploadDocument } from "./documents";
import { markDelivered, packOrder, processReturn, registerReturn, shipOrder } from "./orders";
import { adjustStock, listMovements, listStock, setLocation, setProductImage } from "./stock";
import { createTask, CUSTOMER_TASK_SELECT } from "./tasks";

const run = `sk${Date.now().toString(36)}`;
let T: string, O: string;
let ops: Actor, owner: Actor, other: Actor;
const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
    "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082",
  "hex",
);

describe.skipIf(!process.env.DATABASE_URL)("depo, sipariş durumu, görev ekleri", () => {
  beforeAll(async () => {
    T = (await db().tenant.create({ data: { name: "Stk", slug: `${run}-t` } })).id;
    O = (await db().tenant.create({ data: { name: "Stk2", slug: `${run}-o` } })).id;
    const o = await db().user.create({
      data: { email: `${run}-ops@t.local`, name: "Ops", staffRole: "OPS" },
    });
    const c = await db().user.create({ data: { email: `${run}-c@t.local`, name: "Müşteri" } });
    await db().membership.create({ data: { tenantId: T, userId: c.id, role: "CLIENT_OWNER" } });
    ops = { userId: o.id, role: "OPS", tenantId: null };
    owner = { userId: c.id, role: "CLIENT_OWNER", tenantId: T };
    other = { userId: c.id, role: "CLIENT_OWNER", tenantId: O };
    await db().stockItem.createMany({
      data: [{ tenantId: T, sku: "S1", name: "Ürün 1", quantity: 10, reserved: 4 }],
    });
  });
  afterAll(async () => {
    await db().stockMovement.deleteMany({ where: { tenantId: { in: [T, O] } } });
    await db().returnItem.deleteMany({ where: { tenantId: T } });
    await db().tenant.deleteMany({ where: { id: { in: [T, O] } } });
    await db().user.deleteMany({ where: { email: { startsWith: run } } });
  });

  it("Yönetici rolü personel ve fiyat yönetemez, diğer modüllere erişir", () => {
    expect(can("MANAGER", "staff.manage")).toBe(false);
    expect(can("MANAGER", "pricing.manage")).toBe(false);
    expect(can("MANAGER", "document.review")).toBe(true);
    expect(can("MANAGER", "subscription.manage")).toBe(true);
  });

  it("stok düzeltmesi: müşteri yapamaz, neden zorunlu, ayrılmışın altına inilmez, hareket kaydı düşer", async () => {
    expect((await adjustStock(owner, T, { sku: "S1", delta: 5, note: "deneme" })).ok).toBe(false);
    expect((await adjustStock(ops, T, { sku: "S1", delta: 5, note: "" })).ok).toBe(false);
    expect(await adjustStock(ops, T, { sku: "S1", delta: -7, note: "numune" })).toMatchObject({
      ok: false,
    });
    expect((await adjustStock(ops, T, { sku: "S1", delta: -2, note: "numune çıkışı" })).ok).toBe(
      true,
    );
    const item = await db().stockItem.findFirst({ where: { tenantId: T, sku: "S1" } });
    expect(item?.quantity).toBe(8);
    const mv = await listMovements(T, { sku: "S1" });
    expect(mv.items[0]).toMatchObject({ delta: -2, reason: "ADJUST", note: "numune çıkışı" });
  });

  it("raf konumu doğrulanır ve hareket geçmişine yazılır", async () => {
    expect((await setLocation(ops, T, "S1", "<script>")).ok).toBe(false);
    expect((await setLocation(ops, T, "S1", "a-03-2")).ok).toBe(true);
    const s = await listStock(T, { q: "A-03" });
    expect(s.items[0]?.location).toBe("A-03-2");
    expect((await listMovements(T, { reason: "MOVE" })).total).toBe(1);
  });

  it("ürün görseli: yalnız PNG/JPG, kiracı sınırı", async () => {
    expect(await setProductImage(owner, T, "S1", Buffer.from("%PDF-1.4"))).toMatchObject({
      ok: false,
    });
    expect((await setProductImage(other, T, "S1", PNG)).ok).toBe(false);
    expect((await setProductImage(owner, T, "S1", PNG)).ok).toBe(true);
    const item = await db().stockItem.findFirst({ where: { tenantId: T, sku: "S1" } });
    expect(item?.imageType).toBe("image/png");
  });

  it("sipariş: Hazırlanıyor → Paketlendi → Kargoda → Teslim → tam iade ile İade edildi", async () => {
    const order = await db().order.create({
      data: {
        tenantId: T,
        channel: "MANUAL",
        externalId: `${run}-1`,
        status: "ALLOCATED",
        orderedAt: new Date(),
        shipToEnc: encryptField(JSON.stringify({ name: "X" })),
        lines: { create: [{ tenantId: T, sku: "S1", quantity: 2, externalLineId: "l1" }] },
      } as never,
    });
    expect((await markDelivered(T, order.id, ops.userId)).ok).toBe(false);
    expect((await packOrder(T, order.id, 0, ops.userId)).ok).toBe(false);
    expect((await packOrder(T, order.id, 2, ops.userId)).ok).toBe(true);
    expect((await shipOrder(T, order.id, "DHL", "TRK123456", ops.userId)).ok).toBe(true);
    expect((await markDelivered(T, order.id, ops.userId)).ok).toBe(true);
    const r = await registerReturn(T, { orderId: order.id, sku: "S1", quantity: 2 }, ops.userId);
    expect(r.ok).toBe(true);
    if (r.ok) await processReturn(T, r.id, "DAMAGED", ops.userId);
    const o2 = await db().order.findUnique({ where: { id: order.id } });
    expect(o2?.status).toBe("RETURNED");
    const dmg = await listMovements(T, { reason: "DAMAGE" });
    expect(dmg.items[0]?.note).toMatch(/2 adet hasarlı/);
  });

  it("iç görev ekleri müşteriye dönmez", async () => {
    const task = await createTask(ops, T, { title: "Ek testi", customerVisible: true });
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    const pdf = Buffer.from("%PDF-1.4\n%x\n");
    await uploadDocument({
      tenantId: T,
      kind: "DIGER",
      filename: "acik.pdf",
      data: pdf,
      actorUserId: ops.userId,
      approved: true,
      taskId: task.id,
    });
    await uploadDocument({
      tenantId: T,
      kind: "DIGER",
      filename: "gizli.pdf",
      data: pdf,
      actorUserId: ops.userId,
      approved: true,
      taskId: task.id,
      internal: true,
    });
    const seen = await db().task.findUnique({
      where: { id: task.id },
      select: CUSTOMER_TASK_SELECT,
    });
    expect(seen?.attachments.map((a) => a.filename)).toEqual(["acik.pdf"]);
    const customerDocs = await listDocuments(T, {});
    expect(customerDocs.items.some((d) => d.filename === "gizli.pdf")).toBe(false);
    const staffDocs = await listDocuments(T, { staff: true });
    expect(staffDocs.items.some((d) => d.filename === "gizli.pdf")).toBe(true);
  });
});
