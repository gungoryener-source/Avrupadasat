import { forTenant } from "@avrupadasat/db";
import { audit } from "./audit";
import { draftProductContent, provider, type AiProvider } from "./ai";
import { db } from "./db";
import type { OpResult } from "./orders";

export async function saveContentInput(
  tenantId: string,
  sku: string,
  titleTr: string,
  featuresTr: string,
): Promise<OpResult> {
  const t = forTenant(db(), tenantId);
  if (!(await t.stockItem.findFirst({ where: { sku } })))
    return { ok: false, reason: "Bilinmeyen SKU" };
  const title = titleTr.trim().slice(0, 300);
  const feats = featuresTr.trim().slice(0, 2000);
  if (title.length < 3) return { ok: false, reason: "Ürün adını yazın" };
  const existing = await t.productContent.findFirst({ where: { sku } });
  if (existing)
    await t.productContent.update({
      where: { id: existing.id },
      data: { titleTr: title, featuresTr: feats, status: "DRAFT" },
    });
  else await t.productContent.create({ data: { sku, titleTr: title, featuresTr: feats } as never });
  // Girdi değişince eski onay geçersiz
  await t.stockItem.updateMany({ where: { sku }, data: { contentApprovedAt: null } });
  return { ok: true };
}

export async function generateContent(
  tenantId: string,
  sku: string,
  p: AiProvider = provider(),
): Promise<OpResult> {
  const t = forTenant(db(), tenantId);
  const c = await t.productContent.findFirst({ where: { sku } });
  if (!c) return { ok: false, reason: "Önce Türkçe bilgileri kaydedin" };
  try {
    const d = await draftProductContent({ title: c.titleTr, features: c.featuresTr }, p);
    await t.productContent.update({
      where: { id: c.id },
      data: {
        titleDe: d.titleDe,
        bulletsDe: d.bulletsDe.join("\n"),
        descriptionDe: d.descriptionDe,
        status: "DRAFT",
        aiModel: p.name,
        approvedAt: null,
        approvedById: null,
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

/** İnsan onayı (düzenlemelerle). Demo etiketi kalmış içerik onaylanamaz. */
export async function approveContent(
  tenantId: string,
  sku: string,
  edits: { titleDe: string; bulletsDe: string; descriptionDe: string },
  actorUserId: string,
): Promise<OpResult> {
  const all = `${edits.titleDe}\n${edits.bulletsDe}\n${edits.descriptionDe}`;
  if (all.includes("[Demo]"))
    return { ok: false, reason: "Demo metni içeren içerik onaylanamaz; metni düzenleyin" };
  if (edits.titleDe.trim().length < 5 || edits.descriptionDe.trim().length < 20)
    return { ok: false, reason: "Başlık ve açıklama eksik" };
  const t = forTenant(db(), tenantId);
  const c = await t.productContent.findFirst({ where: { sku } });
  if (!c) return { ok: false, reason: "İçerik bulunamadı" };
  const now = new Date();
  await t.productContent.update({
    where: { id: c.id },
    data: {
      titleDe: edits.titleDe.trim().slice(0, 200),
      bulletsDe: edits.bulletsDe.trim().slice(0, 1500),
      descriptionDe: edits.descriptionDe.trim().slice(0, 2000),
      status: "APPROVED",
      approvedAt: now,
      approvedById: actorUserId,
    },
  });
  await t.stockItem.updateMany({ where: { sku }, data: { contentApprovedAt: now } });
  await audit({
    actorUserId,
    tenantId,
    action: "tenant.updated",
    entity: "ProductContent",
    entityId: c.id,
    meta: { approved: true },
  });
  return { ok: true };
}
