import { decryptField, encryptField } from "@avrupadasat/db/crypto";
import { forTenant, Prisma, type ReturnCondition, type SalesChannel } from "@avrupadasat/db";
import { amazonAdapter, SPAPI_EU_SANDBOX, type AmazonCredentials } from "./amazon";
import { EBAY_SANDBOX_API, ebayAdapter, type EbayCredentials } from "./ebay";
import { SHOP_DOMAIN_RE, shopifyAdapter, type ShopifyCredentials } from "./shopify";
import { audit } from "./audit";
import { db } from "./db";
import { notifyTenant } from "./notifications";
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

const sandbox = () => process.env.INTEGRATIONS_SANDBOX === "1";

/** Kanal + şifreli kimlik bilgisinden canlı adaptör; eksik yapılandırmada açık hata veren adaptör */
export function liveAdapterFor(
  channel: SalesChannel,
  credentialsEnc: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): MarketplaceAdapter {
  if (!credentialsEnc) return liveAdapter(channel);
  const creds = JSON.parse(decryptField(credentialsEnc)) as Record<string, string>;
  if (channel === "AMAZON" && env.AMAZON_SP_API_CLIENT_ID && env.AMAZON_SP_API_CLIENT_SECRET) {
    return amazonAdapter(creds as unknown as AmazonCredentials, {
      clientId: env.AMAZON_SP_API_CLIENT_ID,
      clientSecret: env.AMAZON_SP_API_CLIENT_SECRET,
      endpoint: sandbox() ? SPAPI_EU_SANDBOX : undefined,
    });
  }
  if (channel === "EBAY" && env.EBAY_CLIENT_ID && env.EBAY_CLIENT_SECRET) {
    return ebayAdapter(creds as unknown as EbayCredentials, {
      clientId: env.EBAY_CLIENT_ID,
      clientSecret: env.EBAY_CLIENT_SECRET,
      endpoint: sandbox() ? EBAY_SANDBOX_API : undefined,
    });
  }
  if (channel === "WEBSHOP") return shopifyAdapter(creds as unknown as ShopifyCredentials);
  return liveAdapter(channel);
}

async function adapterFor(
  tenantId: string,
  channel: SalesChannel,
  mode: string,
  credentialsEnc?: string | null,
): Promise<MarketplaceAdapter> {
  if (mode === "live") return liveAdapterFor(channel, credentialsEnc);
  const skus = (
    await forTenant(db(), tenantId).stockItem.findMany({
      where: { quantity: { gt: 0 } },
      select: { sku: true },
      orderBy: { sku: "asc" },
    })
  ).map((s) => s.sku);
  return mockAdapter(channel, skus);
}

/** Panelde gösterilebilecek bağlantı hataları (URL'den gelen metin yalnız bu listedeyse gösterilir) */
export const LIVE_CONNECT_ERRORS: ReadonlySet<string> = new Set([
  "Satış kanalları vergi numaraları tamamlanınca açılır",
  "Geçersiz Amazon kimlik bilgisi",
  "Geçersiz eBay refresh token",
  "Mağaza alan adı ornek.myshopify.com biçiminde olmalı",
  "Geçersiz Shopify erişim anahtarı",
  "Geçersiz depo konumu (gid://shopify/Location/…)",
]);

export type LiveCredentialInput =
  | { channel: "AMAZON"; refreshToken: string; sellerId: string }
  | { channel: "EBAY"; refreshToken: string }
  | {
      channel: "WEBSHOP";
      shop: string;
      accessToken: string;
      locationId: string;
      webhookSecret?: string;
    };

/** Girdiyi doğrular; geçerliyse saklanacak kimlik bilgisi ve gizli olmayan hesap tanımını döner */
export function validateLiveCredentials(
  input: LiveCredentialInput,
):
  | { ok: true; creds: Record<string, string>; account: string | null }
  | { ok: false; reason: string } {
  const bad = (reason: string) => ({ ok: false as const, reason });
  switch (input.channel) {
    case "AMAZON":
      if (
        !/^Atzr\|[A-Za-z0-9_\-|=+/]{20,}$/.test(input.refreshToken) ||
        !/^[A-Z0-9]{8,20}$/.test(input.sellerId)
      )
        return bad("Geçersiz Amazon kimlik bilgisi");
      return {
        ok: true,
        creds: { refreshToken: input.refreshToken, sellerId: input.sellerId },
        account: input.sellerId,
      };
    case "EBAY":
      if (!/^v\^1\.1#[\x21-\x7e]{20,}$/.test(input.refreshToken))
        return bad("Geçersiz eBay refresh token");
      return { ok: true, creds: { refreshToken: input.refreshToken }, account: null };
    case "WEBSHOP": {
      const shop = input.shop
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "");
      if (!SHOP_DOMAIN_RE.test(shop))
        return bad("Mağaza alan adı ornek.myshopify.com biçiminde olmalı");
      if (!/^shpat_[a-f0-9]{32}$/.test(input.accessToken))
        return bad("Geçersiz Shopify erişim anahtarı");
      if (!/^gid:\/\/shopify\/Location\/\d+$/.test(input.locationId))
        return bad("Geçersiz depo konumu (gid://shopify/Location/…)");
      const creds: Record<string, string> = {
        shop,
        accessToken: input.accessToken,
        locationId: input.locationId,
      };
      if (input.webhookSecret) creds.webhookSecret = input.webhookSecret;
      return { ok: true, creds, account: shop };
    }
  }
}

/** Canlı kanal bağlantısı: kimlik bilgileri şifreli saklanır, düz metin hiçbir yerde tutulmaz */
export async function connectLive(
  tenantId: string,
  input: LiveCredentialInput,
  actorUserId: string,
): Promise<OpResult> {
  if ((await registrationState(tenantId)).salesLocked) {
    return { ok: false, reason: "Satış kanalları vergi numaraları tamamlanınca açılır" };
  }
  const v = validateLiveCredentials(input);
  if (!v.ok) return v;
  const t = forTenant(db(), tenantId);
  const existing = await t.marketplaceConnection.findFirst({ where: { channel: input.channel } });
  const data = {
    mode: "live",
    status: "ACTIVE",
    credentialsEnc: encryptField(JSON.stringify(v.creds)),
    externalAccount: v.account,
  };
  if (existing) await t.marketplaceConnection.update({ where: { id: existing.id }, data });
  else await t.marketplaceConnection.create({ data: { channel: input.channel, ...data } as never });
  await audit({
    actorUserId,
    tenantId,
    action: "tenant.updated",
    entity: "MarketplaceConnection",
    meta: { channel: input.channel, mode: "live" },
  });
  return { ok: true };
}

/** Geriye dönük uyumluluk */
export function connectAmazonLive(tenantId: string, creds: AmazonCredentials, actorUserId: string) {
  return connectLive(tenantId, { channel: "AMAZON", ...creds }, actorUserId);
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
    const msg = (e as Error).message.slice(0, 300);
    await t.marketplaceConnection.update({
      where: { id: conn.id },
      data: { lastError: msg, lastErrorAt: new Date() },
    });
    // Aynı hata için tekrar tekrar bildirim üretme: yalnız yeni hata mesajında
    if (conn.lastError !== msg)
      await notifyTenant(tenantId, {
        type: "marketplace",
        title: `${channel === "AMAZON" ? "Amazon.de" : channel === "EBAY" ? "eBay.de" : "Web mağaza"} senkronizasyon hatası`,
        body: msg,
        href: "/panel/pazaryerleri",
        email: true,
      });
    return { ok: false, reason: msg };
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
    data: { lastSyncAt: new Date(), lastError: null, lastErrorAt: null },
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
