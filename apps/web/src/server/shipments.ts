import { assertEuPartyForInbound } from "./eu-party";
import { shipmentStages } from "@avrupadasat/core/events";
import { forTenant, type ShipmentStage } from "@avrupadasat/db";
import { z } from "zod";
import { audit } from "./audit";
import { csvObjects } from "./csv";
import { db } from "./db";
import { emit } from "./outbox";

export const asnInput = z.object({
  reference: z.string().trim().min(2).max(60),
  origin: z.string().trim().max(80).optional(),
  carrier: z.string().trim().max(80).optional(),
  expectedAt: z.coerce.date().optional(),
  pallets: z.coerce.number().int().min(0).max(500),
  cartons: z.coerce.number().int().min(0).max(100_000),
  lines: z
    .array(
      z.object({
        sku: z.string().trim().min(1).max(60),
        quantity: z.number().int().min(1).max(1_000_000),
      }),
    )
    .min(1, "En az bir ürün satırı gerekli")
    .max(1000),
});
export type AsnInput = z.infer<typeof asnInput>;

/** "SKU;adet" satırları veya başlıklı CSV (sku, adet/quantity) */
export function parseAsnLines(text: string): {
  lines: { sku: string; quantity: number }[];
  errors: string[];
} {
  const errors: string[] = [];
  const raw = text.trim();
  if (!raw) return { lines: [], errors: ["Ürün satırı yok"] };
  const hasHeader = /^﻿?\s*sku/i.test(raw);
  const objs = hasHeader
    ? csvObjects(raw)
    : raw.split(/\r?\n/).map((l) => {
        const [sku, q] = l.split(/[;,\t]/);
        return { sku: sku ?? "", adet: q ?? "" };
      });
  const map = new Map<string, number>();
  objs.forEach((o, i) => {
    const sku = (o.sku ?? "").trim();
    const q = Number((o.adet ?? o.quantity ?? o.miktar ?? "").replace(/\./g, ""));
    if (!sku) return;
    if (!Number.isInteger(q) || q <= 0) errors.push(`Satır ${i + 1}: geçersiz adet (${sku})`);
    else map.set(sku, (map.get(sku) ?? 0) + q);
  });
  return { lines: [...map].map(([sku, quantity]) => ({ sku, quantity })), errors };
}

export async function createAsn(tenantId: string, input: AsnInput, actorUserId: string) {
  const data = asnInput.parse(input);
  await assertEuPartyForInbound(tenantId);
  const t = forTenant(db(), tenantId);
  if (await t.shipment.findFirst({ where: { reference: data.reference } })) {
    throw new Error("Bu referansla bir sevkiyat zaten var");
  }
  return db().$transaction(async (tx) => {
    const s = await tx.shipment.create({
      data: {
        tenantId,
        reference: data.reference,
        origin: data.origin ?? null,
        carrier: data.carrier ?? null,
        expectedAt: data.expectedAt ?? null,
        pallets: data.pallets,
        cartons: data.cartons,
        stage: "FABRIKA",
      },
    });
    await tx.asnLine.createMany({
      data: data.lines.map((l) => ({ ...l, tenantId, shipmentId: s.id })),
    });
    await tx.shipmentEvent.create({
      data: {
        tenantId,
        shipmentId: s.id,
        stage: "FABRIKA",
        note: "Sevkiyat bildirildi",
        actorUserId,
      },
    });
    // Katalogda olmayan SKU'lar stok kartı olarak açılır (miktar 0, mal kabulde artar)
    for (const l of data.lines) {
      await tx.stockItem.upsert({
        where: { tenantId_sku: { tenantId, sku: l.sku } },
        update: {},
        create: { tenantId, sku: l.sku, name: l.sku },
      });
    }
    await audit(
      {
        actorUserId,
        tenantId,
        action: "shipment.created",
        entity: "Shipment",
        entityId: s.id,
        meta: { lines: data.lines.length },
      },
      tx,
    );
    return s;
  });
}

export async function advanceStage(
  tenantId: string,
  shipmentId: string,
  stage: ShipmentStage,
  note: string | null,
  actorUserId: string,
) {
  if (!shipmentStages.includes(stage)) throw new Error("Geçersiz aşama");
  const t = forTenant(db(), tenantId);
  const s = await t.shipment.findFirst({ where: { id: shipmentId } });
  if (!s) throw new Error("Sevkiyat bulunamadı");
  await db().$transaction(async (tx) => {
    await tx.shipment.update({ where: { id: s.id }, data: { stage } });
    const ev = await tx.shipmentEvent.create({
      data: { tenantId, shipmentId: s.id, stage, note, actorUserId },
    });
    await emit(
      tx,
      "shipment.status_changed.v1",
      { shipmentId: s.id, stage, at: ev.at.toISOString() },
      { tenantId },
    );
    await audit(
      {
        actorUserId,
        tenantId,
        action: "shipment.updated",
        entity: "Shipment",
        entityId: s.id,
        meta: { stage },
      },
      tx,
    );
  });
}

/** Mal kabul: sayım sonuçları stoğa işlenir; hasarlı adet stoğa girmez */
export async function receiveShipment(
  tenantId: string,
  shipmentId: string,
  counts: { sku: string; receivedQty: number; damagedQty: number }[],
  actorUserId: string,
) {
  const t = forTenant(db(), tenantId);
  const s = await t.shipment.findFirst({ where: { id: shipmentId }, include: { lines: true } });
  if (!s) throw new Error("Sevkiyat bulunamadı");
  if (s.receivedAt) throw new Error("Bu sevkiyatın mal kabulü zaten yapıldı");
  const bySku = new Map(s.lines.map((l) => [l.sku, l]));
  for (const c of counts) {
    if (!bySku.has(c.sku)) throw new Error(`ASN'de olmayan SKU: ${c.sku}`);
    if (c.receivedQty < 0 || c.damagedQty < 0 || c.damagedQty > c.receivedQty)
      throw new Error(`Geçersiz sayım: ${c.sku}`);
  }
  await db().$transaction(async (tx) => {
    for (const c of counts) {
      const line = bySku.get(c.sku)!;
      await tx.asnLine.update({
        where: { id: line.id },
        data: { receivedQty: c.receivedQty, damagedQty: c.damagedQty },
      });
      const good = c.receivedQty - c.damagedQty;
      if (good > 0) {
        await tx.stockItem.update({
          where: { tenantId_sku: { tenantId, sku: c.sku } },
          data: { quantity: { increment: good } },
        });
        await tx.stockMovement.create({
          data: { tenantId, sku: c.sku, delta: good, reason: "RECEIVE", refId: s.id, actorUserId },
        });
      }
      if (c.damagedQty > 0) {
        await tx.stockMovement.create({
          data: {
            tenantId,
            sku: c.sku,
            delta: 0,
            reason: "DAMAGE",
            refId: s.id,
            actorUserId,
            note: `Mal kabulde ${c.damagedQty} adet hasarlı`,
          },
        });
      }
    }
    await tx.shipment.update({
      where: { id: s.id },
      data: { stage: "DEPO_KABUL", receivedAt: new Date() },
    });
    const ev = await tx.shipmentEvent.create({
      data: {
        tenantId,
        shipmentId: s.id,
        stage: "DEPO_KABUL",
        note: "Mal kabul tamamlandı",
        actorUserId,
      },
    });
    await emit(
      tx,
      "shipment.status_changed.v1",
      { shipmentId: s.id, stage: "DEPO_KABUL", at: ev.at.toISOString() },
      { tenantId },
    );
    await audit(
      {
        actorUserId,
        tenantId,
        action: "shipment.updated",
        entity: "Shipment",
        entityId: s.id,
        meta: { received: true },
      },
      tx,
    );
  });
}

/** Katalog içe aktarma (müşteri): sku, ad, ean — miktarlara dokunmaz */
export async function importCatalog(tenantId: string, csvText: string, actorUserId: string) {
  const rows = csvObjects(csvText);
  const errors: string[] = [];
  let created = 0;
  let updated = 0;
  if (rows.length > 5000) return { created, updated, errors: ["En fazla 5000 satır"] };
  const t = forTenant(db(), tenantId);
  for (const [i, r] of rows.entries()) {
    const sku = (r.sku ?? "").trim();
    const name = (r.ad ?? r.urunadi ?? r.name ?? "").trim();
    const ean = (r.ean ?? r.barkod ?? "").trim();
    if (!sku || sku.length > 60) {
      errors.push(`Satır ${i + 2}: SKU eksik veya çok uzun`);
      continue;
    }
    if (!name) {
      errors.push(`Satır ${i + 2}: ürün adı eksik (${sku})`);
      continue;
    }
    if (ean && !/^\d{8,14}$/.test(ean)) {
      errors.push(`Satır ${i + 2}: EAN 8–14 rakam olmalı (${sku})`);
      continue;
    }
    const existing = await t.stockItem.findFirst({ where: { sku } });
    if (existing) {
      await t.stockItem.update({
        where: { id: existing.id },
        data: { name: name.slice(0, 200), ean: ean || null },
      });
      updated++;
    } else {
      await t.stockItem.create({
        data: { sku, name: name.slice(0, 200), ean: ean || null } as never,
      });
      created++;
    }
  }
  await audit({
    actorUserId,
    tenantId,
    action: "stock.imported",
    entity: "StockItem",
    meta: { created, updated, errors: errors.length },
  });
  return { created, updated, errors };
}

/** Ekip/partner sayım düzeltmesi (sku, miktar) — fark hareket olarak kaydedilir */
export async function importStockCounts(tenantId: string, csvText: string, actorUserId: string) {
  const rows = csvObjects(csvText);
  const errors: string[] = [];
  let adjusted = 0;
  await db().$transaction(async (tx) => {
    for (const [i, r] of rows.entries()) {
      const sku = (r.sku ?? "").trim();
      const qty = Number(r.miktar ?? r.adet ?? r.quantity);
      if (!sku || !Number.isInteger(qty) || qty < 0) {
        errors.push(`Satır ${i + 2}: geçersiz`);
        continue;
      }
      const item = await tx.stockItem.findUnique({ where: { tenantId_sku: { tenantId, sku } } });
      if (!item) {
        errors.push(`Satır ${i + 2}: bilinmeyen SKU ${sku}`);
        continue;
      }
      const delta = qty - item.quantity;
      if (delta === 0) continue;
      await tx.stockItem.update({ where: { id: item.id }, data: { quantity: qty } });
      await tx.stockMovement.create({
        data: {
          tenantId,
          sku,
          delta,
          reason: "ADJUST",
          actorUserId,
          note: `Sayım: ${item.quantity} → ${qty}`,
        },
      });
      adjusted++;
    }
    await audit(
      {
        actorUserId,
        tenantId,
        action: "stock.imported",
        entity: "StockItem",
        meta: { adjusted, errors: errors.length, kind: "count" },
      },
      tx,
    );
  });
  return { adjusted, errors };
}

/** Taşıyıcı, takip no ve tahmini varış güncellemesi (ekip). Müşteri sevkiyat sayfasında görür. */
export async function updateShipmentTransport(
  tenantId: string,
  shipmentId: string,
  input: { carrier?: string; trackingNo?: string; expectedAt?: string },
  actorUserId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const t = forTenant(db(), tenantId);
  const sh = await t.shipment.findFirst({ where: { id: shipmentId } });
  if (!sh) return { ok: false, reason: "Sevkiyat bulunamadı" };
  const tracking = input.trackingNo?.trim() ?? "";
  if (tracking && !/^[A-Za-z0-9-]{6,40}$/.test(tracking))
    return { ok: false, reason: "Takip no 6–40 harf/rakam olmalı" };
  const eta = input.expectedAt ? new Date(`${input.expectedAt}T12:00:00Z`) : null;
  if (eta && Number.isNaN(eta.getTime())) return { ok: false, reason: "Geçersiz tarih" };
  await t.shipment.update({
    where: { id: sh.id },
    data: {
      carrier: input.carrier?.trim().slice(0, 80) || null,
      trackingNo: tracking || null,
      expectedAt: eta,
    },
  });
  await audit({
    actorUserId,
    tenantId,
    action: "shipment.updated",
    entity: "Shipment",
    entityId: sh.id,
    meta: { transport: true },
  });
  return { ok: true };
}
