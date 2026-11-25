import { forTenant, type SalesChannel } from "@avrupadasat/db";
import { audit } from "./audit";
import { draftReply, provider, translateDeToTr, type AiProvider } from "./ai";
import { db } from "./db";
import type { OpResult } from "./orders";

/** Demo: bağlı kanallardaki son siparişlerden örnek Almanca alıcı mesajları üretir */
const SAMPLES = [
  {
    subject: "Lieferzeit",
    body: "Hallo, wann wird meine Bestellung ungefähr geliefert? Vielen Dank!",
  },
  {
    subject: "Farbe anders als erwartet",
    body: "Guten Tag, das Handtuch ist etwas dunkler als auf dem Foto. Kann ich es umtauschen?",
  },
];

export async function fetchMessages(tenantId: string, p: AiProvider = provider()): Promise<number> {
  const t = forTenant(db(), tenantId);
  const orders = await t.order.findMany({
    where: { channel: { in: ["AMAZON", "EBAY"] } },
    orderBy: { orderedAt: "desc" },
    take: 2,
  });
  let n = 0;
  for (const [i, o] of orders.entries()) {
    const sample = SAMPLES[i % SAMPLES.length]!;
    const exists = await t.customerMessage.findFirst({
      where: { channel: o.channel, externalId: `MSG-${o.externalId}` },
    });
    if (exists) continue;
    await t.customerMessage.create({
      data: {
        channel: o.channel as SalesChannel,
        externalId: `MSG-${o.externalId}`,
        orderRef: o.externalId,
        buyerName: "Kunde",
        subject: sample.subject,
        bodyDe: sample.body,
        bodyTr: await translateDeToTr(sample.body, p),
        aiModel: p.name,
      } as never,
    });
    n++;
  }
  return n;
}

export async function generateDraft(
  tenantId: string,
  messageId: string,
  p: AiProvider = provider(),
): Promise<OpResult> {
  const t = forTenant(db(), tenantId);
  const m = await t.customerMessage.findFirst({ where: { id: messageId } });
  if (!m) return { ok: false, reason: "Mesaj bulunamadı" };
  if (m.status === "SENT") return { ok: false, reason: "Yanıt zaten gönderildi" };
  const tenant = await db().tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const order = m.orderRef
    ? await t.order.findFirst({ where: { externalId: m.orderRef }, include: { lines: true } })
    : null;
  const orderInfo = order
    ? `Bestellung ${order.externalId}, Status ${order.status}${order.trackingNo ? `, Sendungsnummer ${order.carrier} ${order.trackingNo}` : ""}, Artikel: ${order.lines.map((l) => `${l.quantity}x ${l.sku}`).join(", ")}`
    : "keine Bestellung zugeordnet";
  try {
    const d = await draftReply(
      { buyer: m.buyerName, subject: m.subject, bodyDe: m.bodyDe, orderInfo, shop: tenant.name },
      p,
    );
    await t.customerMessage.update({
      where: { id: m.id },
      data: { draftDe: d.de, draftTr: d.tr, status: "DRAFTED", aiModel: p.name },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: (e as Error).message };
  }
}

/** İnsan onayı: kullanıcı taslağı düzenleyip onaylar; ancak o zaman gönderilir */
export async function approveAndSend(
  tenantId: string,
  messageId: string,
  finalDe: string,
  actorUserId: string,
): Promise<OpResult> {
  const text = finalDe.trim();
  if (text.length < 10 || text.length > 3000)
    return { ok: false, reason: "Yanıt 10–3000 karakter olmalı" };
  const t = forTenant(db(), tenantId);
  const m = await t.customerMessage.findFirst({ where: { id: messageId } });
  if (!m) return { ok: false, reason: "Mesaj bulunamadı" };
  if (m.status === "SENT") return { ok: false, reason: "Yanıt zaten gönderildi" };
  // Canlı modda pazaryeri mesaj API'sine iletilir; demo modda yalnız kaydedilir
  await t.customerMessage.update({
    where: { id: m.id },
    data: { draftDe: text, status: "SENT", sentAt: new Date(), sentById: actorUserId },
  });
  await audit({
    actorUserId,
    tenantId,
    action: "message.replied",
    entity: "CustomerMessage",
    entityId: m.id,
    meta: { edited: text !== m.draftDe },
  });
  return { ok: true };
}
