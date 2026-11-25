import { decryptField, encryptField } from "@avrupadasat/db/crypto";
import { forTenant, Prisma, type ReturnCondition, type SalesChannel } from "@avrupadasat/db";
import { amazonAdapter, type AmazonCredentials } from "./amazon";
import { audit } from "./audit";
import { db } from "./db";
import {
  liveAdapter,
  mockAdapter,
  type ExternalOrder,
  type MarketplaceAdapter,
} from "./marketplace";
import { emit } from "./outbox";
import { registrationState } from "./panel";

export type OpResult<T = unknown> = ({ ok: true } & T) | { ok: false; reason: string };

export async function connectChannel(
  tenantId: string,
  channel: SalesChannel,
  actorUserId: string,
): Promise<OpResult> {
  if ((await registrationState(tenantId)).salesLocked) {
    return { ok: false, reason: "Satış kanalları vergi numaraları tamamlanınca açılır" };
  }
  const t = forTenant(db(), tenantId);
  const existing = await t.marketplaceConnection.findFirst({ where: { channel } });
  if (existing) return { ok: false, reason: "Bu kanal zaten bağlı" };
  await t.marketplaceConnection.create({
    data: { channel, mode: process.env.INTEGRATIONS_MODE === "live" ? "live" : "mock" } as never,
  });
  await audit({
    actorUserId,
    tenantId,
    action: "tenant.updated",
    entity: "MarketplaceConnection",
    meta: { channel },
  });
  return { ok: true };
}

async function adapterFor(
  tenantId: string,
  channel: SalesChannel,
  mode: string,
  credentialsEnc?: string | null,
): Promise<MarketplaceAdapter> {
  if (mode === "live") {
    const clientId = process.env.AMAZON_SP_API_CLIENT_ID;
    const clientSecret = process.env.AMAZON_SP_API_CLIENT_SECRET;
    if (channel === "AMAZON" && clientId && clientSecret && credentialsEnc) {
      const creds = JSON.parse(decryptField(credentialsEnc)) as AmazonCredentials;
      return amazonAdapter(creds, { clientId, clientSecret });
    }
    return liveAdapter(channel);
  }
  const skus = (
    await forTenant(db(), tenantId).stockItem.findMany({
      where: { quantity: { gt: 0 } },
      select: { sku: true },
      orderBy: { sku: "asc" },
    })
  ).map((s) => s.sku);
  return mockAdapter(channel, skus);
}

/** Canlı Amazon bağlantısı: satıcının refresh token'ı ve sellerId'si şifreli saklanır */
export async function connectAmazonLive(
  tenantId: string,
  creds: AmazonCredentials,
  actorUserId: string,
): Promise<OpResult> {
  if (
    !/^Atzr\|[A-Za-z0-9_\-|=+/]{20,}$/.test(creds.refreshToken) ||
    !/^[A-Z0-9]{8,20}$/.test(creds.sellerId)
  ) {
    return { ok: false, reason: "Geçersiz Amazon kimlik bilgisi" };
  }
  const t = forTenant(db(), tenantId);
  const existing = await t.marketplaceConnection.findFirst({ where: { channel: "AMAZON" } });
  const data = {
    mode: "live",
    status: "ACTIVE",
    credentialsEnc: encryptField(JSON.stringify(creds)),
  };
  if (existing) await t.marketplaceConnection.update({ where: { id: existing.id }, data });
  else await t.marketplaceConnection.create({ data: { channel: "AMAZON", ...data } as never });
  await audit({
    actorUserId,
    tenantId,
    action: "tenant.updated",
    entity: "MarketplaceConnection",
    meta: { channel: "AMAZON", mode: "live" },
  });
  return { ok: true };
}

/** Siparişleri içe aktarır (idempotent) ve stoğu rezerve eder */
export async function syncOrders(
  tenantId: string,
  channel: SalesChannel,
  adapter?: MarketplaceAdapter,
): Promise<OpResult<{ imported: number; held: number }>> {
  const t = forTenant(db(), tenantId);
  const conn = await t.marketplaceConnection.findFirst({ where: { channel } });
  if (!conn) return { ok: false, reason: "Kanal bağlı değil" };
  if ((await registrationState(tenantId)).salesLocked)
    return { ok: false, reason: "Satış kilitli" };
  const a = adapter ?? (await adapterFor(tenantId, channel, conn.mode, conn.credentialsEnc));
  let external: ExternalOrder[];
  try {
    external = await a.fetchOrders(conn.lastSyncAt);
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
  let imported = 0;
  let held = 0;
  for (const ext of external) {
    const r = await importOne(tenantId, channel, ext);
    if (r === "imported") imported++;
    if (r === "held") {
      imported++;
      held++;
    }
  }
  await t.marketplaceConnection.update({
    where: { id: conn.id },
    data: { lastSyncAt: new Date() },
  });
  return { ok: true, imported, held };
}

async function importOne(
  tenantId: string,
  channel: SalesChannel,
  ext: ExternalOrder,
): Promise<"imported" | "held" | "duplicate"> {
  try {
    return await db().$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          tenantId,
          channel,
          externalId: ext.externalId,
          shipToEnc: encryptField(JSON.stringify(ext.buyer)),
          country: ext.buyer.country,
          itemsCents: ext.lines.reduce((s, l) => s + l.priceCents * l.quantity, 0),
          orderedAt: ext.orderedAt,
          lines: { create: ext.lines.map((l) => ({ ...l, tenantId })) },
        },
      });
      // Rezervasyon: koşullu güncelleme ile yarış durumunda negatif stok oluşmaz
      let ok = true;
      for (const l of ext.lines) {
        const n = await tx.$executeRaw`
          UPDATE "StockItem" SET "reserved" = "reserved" + ${l.quantity}
          WHERE "tenantId" = ${tenantId} AND "sku" = ${l.sku} AND "quantity" - "reserved" >= ${l.quantity}`;
        if (n !== 1) {
          ok = false;
          break;
        }
      }
      if (!ok) {
        // Kısmi rezervasyonu geri al: işlemi iptal edip siparişi beklemede olarak yeniden yaz
        throw new HoldError();
      }
      await tx.order.update({ where: { id: order.id }, data: { status: "ALLOCATED" } });
      await tx.workOrder.create({ data: { tenantId, orderId: order.id, type: "PICK_PACK" } });
      await emit(
        tx,
        "order.created.v1",
        { orderId: order.id, channel, status: "ALLOCATED" },
        { tenantId, idempotencyKey: `order:${tenantId}:${channel}:${ext.externalId}` },
      );
      return "imported" as const;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return "duplicate";
    if (e instanceof HoldError) {
      await db()
        .order.create({
          data: {
            tenantId,
            channel,
            externalId: ext.externalId,
            status: "ON_HOLD",
            holdReason: "Yetersiz stok",
            shipToEnc: encryptField(JSON.stringify(ext.buyer)),
            country: ext.buyer.country,
            itemsCents: ext.lines.reduce((s, l) => s + l.priceCents * l.quantity, 0),
            orderedAt: ext.orderedAt,
            lines: { create: ext.lines.map((l) => ({ ...l, tenantId })) },
          },
        })
        .catch(() => undefined);
      return "held";
    }
    throw e;
  }
}

class HoldError extends Error {}

/** Beklemedeki siparişi stok geldikten sonra yeniden dener */
export async function retryHeld(tenantId: string, orderId: string): Promise<OpResult> {
  const t = forTenant(db(), tenantId);
  const o = await t.order.findFirst({
    where: { id: orderId, status: "ON_HOLD" },
    include: { lines: true },
  });
  if (!o) return { ok: false, reason: "Beklemede sipariş bulunamadı" };
  try {
    await db().$transaction(async (tx) => {
      for (const l of o.lines) {
        const n = await tx.$executeRaw`
          UPDATE "StockItem" SET "reserved" = "reserved" + ${l.quantity}
          WHERE "tenantId" = ${tenantId} AND "sku" = ${l.sku} AND "quantity" - "reserved" >= ${l.quantity}`;
        if (n !== 1) throw new HoldError();
      }
      await tx.order.update({
        where: { id: o.id },
        data: { status: "ALLOCATED", holdReason: null },
      });
      await tx.workOrder.create({ data: { tenantId, orderId: o.id, type: "PICK_PACK" } });
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof HoldError) return { ok: false, reason: "Stok hâlâ yetersiz" };
    throw e;
  }
}

/** Paketleme tamam: stok düşer, rezervasyon kalkar, takip pazaryerine iletilir */
export async function shipOrder(
  tenantId: string,
  orderId: string,
  carrier: string,
  trackingNo: string,
  actorUserId: string,
  adapter?: MarketplaceAdapter,
): Promise<OpResult> {
  if (!/^[A-Za-z0-9-]{6,40}$/.test(trackingNo))
    return { ok: false, reason: "Geçersiz takip numarası" };
  const t = forTenant(db(), tenantId);
  const o = await t.order.findFirst({ where: { id: orderId }, include: { lines: true } });
  if (!o) return { ok: false, reason: "Sipariş bulunamadı" };
  if (o.status !== "ALLOCATED")
    return { ok: false, reason: "Yalnız rezerve edilmiş sipariş kargolanabilir" };
  await db().$transaction(async (tx) => {
    for (const l of o.lines) {
      await tx.stockItem.update({
        where: { tenantId_sku: { tenantId, sku: l.sku } },
        data: { quantity: { decrement: l.quantity }, reserved: { decrement: l.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          tenantId,
          sku: l.sku,
          delta: -l.quantity,
          reason: "ORDER",
          refId: o.id,
          actorUserId,
        },
      });
    }
    await tx.order.update({
      where: { id: o.id },
      data: { status: "SHIPPED", carrier, trackingNo, shippedAt: new Date() },
    });
    await tx.workOrder.updateMany({
      where: { orderId: o.id, status: "OPEN" },
      data: { status: "DONE", completedAt: new Date(), completedById: actorUserId },
    });
    await emit(
      tx,
      "order.shipped.v1",
      { orderId: o.id, channel: o.channel, carrier, trackingNo },
      { tenantId },
    );
    await audit(
      {
        actorUserId,
        tenantId,
        action: "order.updated",
        entity: "Order",
        entityId: o.id,
        meta: { status: "SHIPPED" },
      },
      tx,
    );
  });
  if (o.channel !== "MANUAL" && o.channel !== "WEBSHOP") {
    const conn = await t.marketplaceConnection.findFirst({ where: { channel: o.channel } });
    const a =
      adapter ??
      (conn ? await adapterFor(tenantId, o.channel, conn.mode, conn.credentialsEnc) : null);
    // Takip bildirimi başarısız olursa kargo geri alınmaz; ekip görsün diye kaydedilir
    await a
      ?.pushTracking(
        o.externalId,
        carrier,
        trackingNo,
        o.lines.map((l) => ({ externalLineId: l.externalLineId, quantity: l.quantity })),
      )
      .catch(async (e: unknown) => {
        await audit({
          actorUserId,
          tenantId,
          action: "order.updated",
          entity: "Order",
          entityId: o.id,
          meta: { trackingPushFailed: (e as Error).message.slice(0, 200) },
        });
      });
  }
  return { ok: true };
}

export async function cancelOrder(
  tenantId: string,
  orderId: string,
  actorUserId: string,
): Promise<OpResult> {
  const t = forTenant(db(), tenantId);
  const o = await t.order.findFirst({ where: { id: orderId }, include: { lines: true } });
  if (!o) return { ok: false, reason: "Sipariş bulunamadı" };
  if (!["NEW", "ON_HOLD", "ALLOCATED"].includes(o.status))
    return { ok: false, reason: "Kargolanmış sipariş iptal edilemez" };
  await db().$transaction(async (tx) => {
    if (o.status === "ALLOCATED") {
      for (const l of o.lines) {
        await tx.stockItem.update({
          where: { tenantId_sku: { tenantId, sku: l.sku } },
          data: { reserved: { decrement: l.quantity } },
        });
      }
    }
    await tx.order.update({ where: { id: o.id }, data: { status: "CANCELLED" } });
    await tx.workOrder.updateMany({
      where: { orderId: o.id, status: "OPEN" },
      data: { status: "CANCELLED" },
    });
    await audit(
      {
        actorUserId,
        tenantId,
        action: "order.updated",
        entity: "Order",
        entityId: o.id,
        meta: { status: "CANCELLED" },
      },
      tx,
    );
  });
  return { ok: true };
}

export async function registerReturn(
  tenantId: string,
  input: { orderId?: string; sku: string; quantity: number; reason?: string },
  actorUserId: string,
): Promise<OpResult<{ id: string }>> {
  const t = forTenant(db(), tenantId);
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 10_000)
    return { ok: false, reason: "Geçersiz adet" };
  if (!(await t.stockItem.findFirst({ where: { sku: input.sku } })))
    return { ok: false, reason: "Bilinmeyen SKU" };
  if (input.orderId && !(await t.order.findFirst({ where: { id: input.orderId } })))
    return { ok: false, reason: "Sipariş bulunamadı" };
  const r = await t.returnItem.create({
    data: {
      orderId: input.orderId ?? null,
      sku: input.sku,
      quantity: input.quantity,
      reason: input.reason?.slice(0, 200) ?? null,
    } as never,
  });
  await audit({
    actorUserId,
    tenantId,
    action: "return.created",
    entity: "ReturnItem",
    entityId: r.id,
  });
  return { ok: true, id: r.id };
}

/** İade işleme: satılabilir → stoğa döner; yeniden paketlenecek → stoğa döner + not; hasarlı → hareket kaydı */
export async function processReturn(
  tenantId: string,
  returnId: string,
  condition: ReturnCondition,
  actorUserId: string,
): Promise<OpResult> {
  const t = forTenant(db(), tenantId);
  const r = await t.returnItem.findFirst({ where: { id: returnId } });
  if (!r) return { ok: false, reason: "İade bulunamadı" };
  if (r.status === "PROCESSED") return { ok: false, reason: "İade zaten işlendi" };
  await db().$transaction(async (tx) => {
    if (condition !== "DAMAGED") {
      await tx.stockItem.update({
        where: { tenantId_sku: { tenantId, sku: r.sku } },
        data: { quantity: { increment: r.quantity } },
      });
    }
    await tx.stockMovement.create({
      data: {
        tenantId,
        sku: r.sku,
        delta: condition === "DAMAGED" ? 0 : r.quantity,
        reason: condition === "DAMAGED" ? "DAMAGE" : "RETURN",
        refId: r.id,
        actorUserId,
      },
    });
    await tx.returnItem.update({
      where: { id: r.id },
      data: { condition, status: "PROCESSED", processedAt: new Date() },
    });
    await emit(tx, "return.processed.v1", { returnId: r.id, sku: r.sku, condition }, { tenantId });
  });
  return { ok: true };
}

export function shipTo(enc: string): {
  name: string;
  street: string;
  zip: string;
  city: string;
  country: string;
} {
  return JSON.parse(decryptField(enc));
}
