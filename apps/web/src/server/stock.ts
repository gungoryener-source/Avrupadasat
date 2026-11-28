/**
 * Depo ve stok derinliği: hareket geçmişi, elle düzeltme, raf konumu, ürün görseli,
 * yoldaki (gelen) ve ayrılmış (giden) miktarlar. Her değişiklik StockMovement + denetim kaydı bırakır.
 */
import { z } from "zod";
import { can, canAccessTenant, type Actor } from "@avrupadasat/core/roles";
import { forTenant } from "@avrupadasat/db";
import { audit } from "./audit";
import { db } from "./db";
import { detectType, scanBuffer } from "./files";
import { getObject, putObject } from "./storage";

export const MOVEMENT_LABEL: Record<string, string> = {
  RECEIVE: "Mal kabul",
  ORDER: "Sipariş çıkışı",
  RETURN: "İade girişi",
  ADJUST: "Sayım / düzeltme",
  DAMAGE: "Hasar",
  MOVE: "Raf değişikliği",
};

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

type R = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Ürün listesi + yoldaki miktar (depoya henüz kabul edilmemiş sevkiyatlar) */
export async function listStock(
  tenantId: string,
  f: { q?: string; low?: boolean; page?: number; pageSize?: number } = {},
) {
  const t = forTenant(db(), tenantId);
  const pageSize = f.pageSize ?? 50;
  const page = Math.max(1, f.page ?? 1);
  const where = f.q
    ? {
        OR: [
          { sku: { contains: f.q, mode: "insensitive" as const } },
          { name: { contains: f.q, mode: "insensitive" as const } },
          { location: { contains: f.q, mode: "insensitive" as const } },
        ],
      }
    : {};
  const all = await t.stockItem.findMany({ where, orderBy: { sku: "asc" } });
  const incoming = await incomingBySku(tenantId);
  let items = all.map((s) => ({
    ...s,
    available: s.quantity - s.reserved,
    incoming: incoming.get(s.sku) ?? 0,
    low: s.lowStockAt != null && s.quantity - s.reserved <= s.lowStockAt,
  }));
  if (f.low) items = items.filter((i) => i.low);
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total: items.length,
    page,
    pageSize,
    totals: {
      skus: all.length,
      units: all.reduce((a, s) => a + s.quantity, 0),
      reserved: all.reduce((a, s) => a + s.reserved, 0),
      incoming: [...incoming.values()].reduce((a, n) => a + n, 0),
      low: items.filter((i) => i.low).length,
    },
  };
}

export async function incomingBySku(tenantId: string) {
  const lines = await db().asnLine.findMany({
    where: { tenantId, receivedQty: null, shipment: { stage: { not: "DEPO_KABUL" } } },
    select: { sku: true, quantity: true },
  });
  const m = new Map<string, number>();
  for (const l of lines) m.set(l.sku, (m.get(l.sku) ?? 0) + l.quantity);
  return m;
}

export async function listMovements(
  tenantId: string,
  f: { sku?: string; reason?: string; page?: number; pageSize?: number } = {},
) {
  const t = forTenant(db(), tenantId);
  const pageSize = f.pageSize ?? 30;
  const page = Math.max(1, f.page ?? 1);
  const where = {
    ...(f.sku ? { sku: f.sku } : {}),
    ...(f.reason && f.reason in MOVEMENT_LABEL ? { reason: f.reason } : {}),
  };
  const [items, total] = await Promise.all([
    t.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    t.stockMovement.count({ where }),
  ]);
  const ids = [...new Set(items.map((m) => m.actorUserId).filter(Boolean) as string[])];
  const users = ids.length
    ? await db().user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, staffRole: true },
      })
    : [];
  const who = Object.fromEntries(
    users.map((u) => [u.id, u.staffRole ? `${u.name} (depo ekibi)` : u.name]),
  );
  return { items, total, page, pageSize, who };
}

const adjustInput = z.object({
  sku: z.string().trim().min(1).max(60),
  delta: z.coerce
    .number()
    .int("Tam sayı girin")
    .refine((n) => n !== 0, "Sıfırdan farklı olmalı")
    .refine((n) => Math.abs(n) <= 100_000, "Çok büyük"),
  note: z.string().trim().min(3, "Neden yazın (en az 3 karakter)").max(200),
});

/** Tek ürün giriş/çıkış düzeltmesi (yalnız depo yetkisi). Ayrılmış miktarın altına düşülemez. */
export async function adjustStock(
  actor: Actor,
  tenantId: string,
  input: unknown,
  ip?: string | null,
): Promise<R> {
  if (!can(actor.role, "stock.write") || actor.tenantId || !canAccessTenant(actor, tenantId))
    return { ok: false, error: "Yetki yok" };
  const p = adjustInput.safeParse(input);
  if (!p.success)
    return {
      ok: false,
      error: "Formu kontrol edin",
      fieldErrors: Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])),
    };
  const { sku, delta, note } = p.data;
  const err = await db().$transaction(async (tx) => {
    const item = await tx.stockItem.findUnique({ where: { tenantId_sku: { tenantId, sku } } });
    if (!item) return "Bilinmeyen SKU";
    if (item.quantity + delta < item.reserved)
      return `Stok ayrılmış miktarın (${item.reserved}) altına düşemez`;
    await tx.stockItem.update({
      where: { id: item.id },
      data: { quantity: { increment: delta } },
    });
    await tx.stockMovement.create({
      data: { tenantId, sku, delta, reason: "ADJUST", note, actorUserId: actor.userId },
    });
    await audit(
      {
        actorUserId: actor.userId,
        tenantId,
        action: "stock.adjusted",
        entity: "StockItem",
        entityId: item.id,
        meta: { delta },
        ip,
      },
      tx,
    );
    return null;
  });
  return err ? { ok: false, error: err } : { ok: true };
}

/** Raf/göz konumu (ör. A-03-2). Değişiklik hareket geçmişine "Raf değişikliği" olarak düşer. */
export async function setLocation(
  actor: Actor,
  tenantId: string,
  sku: string,
  location: string,
): Promise<R> {
  if (!can(actor.role, "stock.write") || actor.tenantId || !canAccessTenant(actor, tenantId))
    return { ok: false, error: "Yetki yok" };
  const loc = location.trim().toUpperCase();
  if (loc && !/^[A-Z0-9][A-Z0-9 ./-]{0,23}$/.test(loc))
    return { ok: false, error: "Konum harf, rakam ve - / . içerebilir (en çok 24 karakter)" };
  const t = forTenant(db(), tenantId);
  const item = await t.stockItem.findFirst({ where: { sku } });
  if (!item) return { ok: false, error: "Bilinmeyen SKU" };
  if ((item.location ?? "") === loc) return { ok: true };
  await t.stockItem.update({ where: { id: item.id }, data: { location: loc || null } });
  await t.stockMovement.create({
    data: {
      sku,
      delta: 0,
      reason: "MOVE",
      note: `Konum: ${item.location ?? "—"} → ${loc || "—"}`,
      actorUserId: actor.userId,
    } as never,
  });
  return { ok: true };
}

/** Ürün görseli: PNG/JPEG, en çok 3 MB; içerik türü dosya başlığından tespit edilir */
export async function setProductImage(
  actor: Actor,
  tenantId: string,
  sku: string,
  data: Buffer,
  ip?: string | null,
): Promise<R> {
  const allowed = actor.tenantId
    ? actor.tenantId === tenantId && can(actor.role, "catalog.write")
    : can(actor.role, "stock.write") && canAccessTenant(actor, tenantId);
  if (!allowed) return { ok: false, error: "Yetki yok" };
  if (data.length === 0) return { ok: false, error: "Görsel seçin" };
  if (data.length > MAX_IMAGE_BYTES) return { ok: false, error: "Görsel en çok 3 MB olabilir" };
  const type = detectType(data);
  if (!type || !type.mime.startsWith("image/"))
    return { ok: false, error: "Yalnız PNG veya JPG yüklenebilir" };
  const scan = await scanBuffer(data);
  if (scan === "infected") return { ok: false, error: "Dosya güvenlik taramasından geçmedi" };
  const t = forTenant(db(), tenantId);
  const item = await t.stockItem.findFirst({ where: { sku } });
  if (!item) return { ok: false, error: "Bilinmeyen SKU" };
  const key = await putObject(data);
  await t.stockItem.update({
    where: { id: item.id },
    data: { imageKey: key, imageType: type.mime },
  });
  await audit({
    actorUserId: actor.userId,
    tenantId,
    action: "stock.adjusted",
    entity: "StockItem",
    entityId: item.id,
    meta: { image: true },
    ip,
  });
  return { ok: true };
}

/** Görsel okuma — çağıran rota oturum ve kiracı erişimini zaten doğrulamış olmalı */
export async function readProductImage(tenantId: string, id: string) {
  const item = await forTenant(db(), tenantId).stockItem.findFirst({ where: { id } });
  if (!item?.imageKey || !item.imageType) return null;
  return { data: await getObject(item.imageKey), type: item.imageType };
}
