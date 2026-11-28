/**
 * Okutarak mal kabul ve rafa yerleştirme.
 * Sayım, sevkiyat satırlarında taslak olarak tutulur (countedQty/countedDamaged): birden fazla
 * cihaz aynı sevkiyatı okutabilir, sayfa yenilense de sayım kaybolmaz. Stoğa işleme yalnız
 * "Mal kabulü tamamla" ile (receiveShipment) yapılır.
 */
import { can, canAccessTenant, type Actor } from "@avrupadasat/core/roles";
import { isLabelCode, normalizeScan, parseShelfScan } from "./barcode";
import { db } from "./db";
import { receiveShipment } from "./shipments";
import { setLocation } from "./stock";

export interface CountLine {
  id: string;
  sku: string;
  name: string;
  code: string | null;
  ean: string | null;
  itemId: string | null;
  image: string | null;
  location: string | null;
  quantity: number;
  counted: number;
  damaged: number;
}

export interface ReceivingState {
  shipmentId: string;
  reference: string;
  tenantName: string;
  received: boolean;
  lines: CountLine[];
}

export type ScanOutcome =
  | { ok: true; lineId: string; sku: string; name: string; added: number; damaged: boolean }
  | { ok: false; error: string; kind: "unknown" | "foreign" | "not_in_asn" | "closed" | "denied" };

function staffCan(actor: Actor, permission: "shipment.write" | "stock.write", tenantId: string) {
  return !actor.tenantId && can(actor.role, permission) && canAccessTenant(actor, tenantId);
}

async function shipmentFor(actor: Actor, shipmentId: string) {
  const sh = await db().shipment.findUnique({
    where: { id: shipmentId },
    select: {
      id: true,
      reference: true,
      tenantId: true,
      receivedAt: true,
      tenant: { select: { name: true } },
    },
  });
  if (!sh || !staffCan(actor, "shipment.write", sh.tenantId)) return null;
  return sh;
}

export async function receivingState(
  actor: Actor,
  shipmentId: string,
): Promise<ReceivingState | null> {
  const sh = await shipmentFor(actor, shipmentId);
  if (!sh) return null;
  const lines = await db().asnLine.findMany({
    where: { shipmentId: sh.id, tenantId: sh.tenantId },
    orderBy: { sku: "asc" },
  });
  const items = await db().stockItem.findMany({
    where: { tenantId: sh.tenantId, sku: { in: lines.map((l) => l.sku) } },
    select: { id: true, sku: true, name: true, labelCode: true, ean: true, imageKey: true, location: true },
  });
  const bySku = new Map(items.map((i) => [i.sku, i]));
  return {
    shipmentId: sh.id,
    reference: sh.reference,
    tenantName: sh.tenant.name,
    received: !!sh.receivedAt,
    lines: lines.map((l) => {
      const i = bySku.get(l.sku);
      return {
        id: l.id,
        sku: l.sku,
        name: i?.name ?? l.sku,
        code: i?.labelCode ?? null,
        ean: i?.ean ?? null,
        itemId: i?.id ?? null,
        image: i?.imageKey ? `/api/urun-gorsel/${i.id}` : null,
        location: i?.location ?? null,
        quantity: l.quantity,
        counted: l.countedQty,
        damaged: l.countedDamaged,
      };
    }),
  };
}

/**
 * Satır sayımını değiştirir (artırma/azaltma). Hasarlı ≤ sayılan ve ikisi de ≥ 0 kalır;
 * tek SQL ifadesiyle yapılır, eşzamanlı okutmalar birbirini ezmez.
 */
async function bump(lineId: string, dCounted: number, dDamaged: number) {
  await db().$executeRaw`
    UPDATE "AsnLine" AS l SET
      "countedQty" = GREATEST(0, l."countedQty" + ${dCounted}),
      "countedDamaged" = LEAST(
        GREATEST(0, l."countedDamaged" + ${dDamaged}),
        GREATEST(0, l."countedQty" + ${dCounted})
      )
    FROM "Shipment" s
    WHERE l.id = ${lineId} AND s.id = l."shipmentId" AND s."receivedAt" IS NULL`;
}

/** Okutulan ürünü sevkiyat satırına sayar. Başka firmanın etiketi açıkça uyarılır. */
export async function scanReceive(
  actor: Actor,
  shipmentId: string,
  raw: string,
  qty: number,
  damaged: boolean,
): Promise<ScanOutcome> {
  const sh = await shipmentFor(actor, shipmentId);
  if (!sh) return { ok: false, error: "Yetki yok", kind: "denied" };
  if (sh.receivedAt)
    return { ok: false, error: "Bu sevkiyatın mal kabulü tamamlandı", kind: "closed" };
  if (!Number.isInteger(qty) || qty < 1 || qty > 1000)
    return { ok: false, error: "Adet 1–1000 arası olmalı", kind: "unknown" };
  const code = normalizeScan(raw).slice(0, 64);
  if (!code) return { ok: false, error: "Kod boş", kind: "unknown" };
  if (parseShelfScan(raw))
    return { ok: false, error: "Bu bir raf etiketi; ürün etiketini okutun", kind: "unknown" };
  const where = isLabelCode(code)
    ? { labelCode: code }
    : /^\d{8,14}$/.test(code)
      ? { ean: code }
      : { sku: { equals: raw.trim(), mode: "insensitive" as const } };
  const items = await db().stockItem.findMany({
    where: { tenantId: sh.tenantId, ...where },
    select: { sku: true, name: true },
    take: 2,
  });
  if (items.length === 0) {
    if (isLabelCode(code)) {
      const other = await db().stockItem.findUnique({
        where: { labelCode: code },
        select: { tenantId: true },
      });
      if (other)
        return {
          ok: false,
          error: "Bu etiket başka bir firmanın ürününe ait. Ürünü ayırın.",
          kind: "foreign",
        };
    }
    return { ok: false, error: `${code}: tanınmayan ürün`, kind: "unknown" };
  }
  if (items.length > 1)
    return {
      ok: false,
      error: "Bu EAN/SKU birden fazla ürüne ait; ürünün depo etiketini okutun",
      kind: "unknown",
    };
  const item = items[0]!;
  const line = await db().asnLine.findFirst({
    where: { shipmentId: sh.id, tenantId: sh.tenantId, sku: item.sku },
    select: { id: true },
  });
  if (!line)
    return {
      ok: false,
      error: `${item.sku} bu sevkiyatın bildiriminde yok. Ayrı bir yere koyun ve not alın.`,
      kind: "not_in_asn",
    };
  await bump(line.id, qty, damaged ? qty : 0);
  return { ok: true, lineId: line.id, sku: item.sku, name: item.name, added: qty, damaged };
}

/** Elle düzeltme: satırın sayılan/hasarlı değerini doğrudan ayarlar */
export async function setLineCount(
  actor: Actor,
  shipmentId: string,
  lineId: string,
  counted: number,
  damaged: number,
): Promise<{ ok: boolean; error?: string }> {
  const sh = await shipmentFor(actor, shipmentId);
  if (!sh) return { ok: false, error: "Yetki yok" };
  if (sh.receivedAt) return { ok: false, error: "Mal kabul tamamlandı" };
  if (
    ![counted, damaged].every((n) => Number.isInteger(n) && n >= 0 && n <= 100000) ||
    damaged > counted
  )
    return { ok: false, error: "Hasarlı adet sayılandan fazla olamaz" };
  const r = await db().asnLine.updateMany({
    where: { id: lineId, shipmentId: sh.id, tenantId: sh.tenantId },
    data: { countedQty: counted, countedDamaged: damaged },
  });
  return r.count ? { ok: true } : { ok: false, error: "Satır bulunamadı" };
}

/** Taslak sayımı stoğa işler (fark varsa onay gerekir) */
export async function completeCounted(
  actor: Actor,
  shipmentId: string,
  acceptDiff: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const sh = await shipmentFor(actor, shipmentId);
  if (!sh) return { ok: false, error: "Yetki yok" };
  if (sh.receivedAt) return { ok: false, error: "Mal kabul zaten tamamlandı" };
  const lines = await db().asnLine.findMany({
    where: { shipmentId: sh.id, tenantId: sh.tenantId },
  });
  if (lines.every((l) => l.countedQty === 0))
    return { ok: false, error: "Henüz hiç ürün okutulmadı" };
  const diff = lines.some((l) => l.countedQty !== l.quantity || l.countedDamaged > 0);
  if (diff && !acceptDiff)
    return { ok: false, error: "Bildirilen ile sayılan arasında fark var; farkları onaylayın" };
  await receiveShipment(
    sh.tenantId,
    sh.id,
    lines.map((l) => ({ sku: l.sku, receivedQty: l.countedQty, damagedQty: l.countedDamaged })),
    actor.userId,
  );
  return { ok: true };
}

export type PutawayOutcome =
  | { ok: true; sku: string; name: string; tenantName: string; from: string | null; to: string }
  | { ok: false; error: string };

/** Rafa yerleştirme: ürün (etiket/EAN/SKU) bulunur ve konumu raf koduna ayarlanır */
export async function putaway(
  actor: Actor,
  rawProduct: string,
  location: string,
): Promise<PutawayOutcome> {
  const code = normalizeScan(rawProduct).slice(0, 64);
  const scope =
    actor.role === "PARTNER" ? { tenantId: { in: [...(actor.partnerTenantIds ?? [])] } } : {};
  if (actor.tenantId) return { ok: false, error: "Yetki yok" };
  const where = isLabelCode(code)
    ? { labelCode: code }
    : /^\d{8,14}$/.test(code)
      ? { ean: code }
      : { sku: { equals: rawProduct.trim(), mode: "insensitive" as const } };
  const items = await db().stockItem.findMany({
    where: { ...scope, ...where },
    select: { sku: true, name: true, tenantId: true, location: true, tenant: { select: { name: true } } },
    take: 2,
  });
  if (items.length === 0) return { ok: false, error: `${code}: ürün bulunamadı` };
  if (items.length > 1)
    return { ok: false, error: "Birden fazla ürün eşleşti; ürünün depo etiketini okutun" };
  const i = items[0]!;
  if (!staffCan(actor, "stock.write", i.tenantId)) return { ok: false, error: "Yetki yok" };
  const r = await setLocation(actor, i.tenantId, i.sku, location);
  if (!r.ok) return { ok: false, error: r.error ?? "Kaydedilemedi" };
  return {
    ok: true,
    sku: i.sku,
    name: i.name,
    tenantName: i.tenant.name,
    from: i.location,
    to: location.trim().toUpperCase(),
  };
}
