import { leadSubmittedV1 } from "@avrupadasat/core/events";
import type { LeadStatus, Prisma } from "@avrupadasat/db";
import type { z } from "zod";
import { audit } from "./audit";
import { db } from "./db";
import { emit } from "./outbox";
import { hit } from "./rate-limit";
import { sha256 } from "./tokens";

export type LeadInput = z.input<typeof leadSubmittedV1>;

export type SubmitLeadResult =
  | { ok: true; leadId: string }
  | { ok: false; reason: "invalid"; fieldErrors: Record<string, string> }
  | { ok: false; reason: "rate_limited" };

const FIELD_MSG: Record<string, string> = {
  companyName: "Firma adını yazın",
  email: "Geçerli bir e-posta yazın",
  phone: "Geçerli bir telefon yazın",
  category: "Ürün kategorisi seçin",
  consentKvkk: "KVKK aydınlatma metnini onaylayın",
};

export async function submitLead(input: unknown, ip: string | null): Promise<SubmitLeadResult> {
  const parsed = leadSubmittedV1.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= FIELD_MSG[key] ?? "Geçersiz değer";
    }
    return { ok: false, reason: "invalid", fieldErrors };
  }
  if (!(await hit(`lead:ip:${ip ?? "?"}`, 5, 3600))) return { ok: false, reason: "rate_limited" };

  const p = parsed.data;
  const email = p.email.toLowerCase();
  // Aynı e-posta ile aynı gün tekrar gönderim tek olay üretir
  const idem = `lead:${sha256(`${email}:${new Date().toISOString().slice(0, 10)}`)}`;
  const lead = await db().$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        companyName: p.companyName,
        email,
        phone: p.phone,
        category: p.category,
        consentKvkk: p.consentKvkk,
        marketingConsent: p.marketingConsent,
        attribution: p.attribution as Prisma.InputJsonValue,
        profile: (p.profile ?? {}) as Prisma.InputJsonValue,
      },
    });
    const dup = await tx.outboxEvent.findUnique({ where: { idempotencyKey: idem } });
    if (!dup) await emit(tx, "lead.submitted.v1", { ...p, email }, { idempotencyKey: idem });
    await audit(
      {
        action: "lead.created",
        entity: "Lead",
        entityId: created.id,
        meta: { category: p.category },
        ip,
      },
      tx,
    );
    return created;
  });
  return { ok: true, leadId: lead.id };
}

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "Yeni",
  REPORT_IN_PROGRESS: "Rapor hazırlanıyor",
  REPORT_SENT: "Rapor gönderildi",
  QUOTED: "Teklif verildi",
  WON: "Kazanıldı",
  LOST: "Kaybedildi",
};

export async function setLeadStatus(
  leadId: string,
  status: LeadStatus,
  actorUserId: string,
  notes?: string,
) {
  await db().$transaction(async (tx) => {
    const before = await tx.lead.update({
      where: { id: leadId },
      data: { status, ...(notes !== undefined ? { notes } : {}) },
    });
    await audit(
      {
        actorUserId,
        action: "lead.status_changed",
        entity: "Lead",
        entityId: leadId,
        meta: { status: before.status },
      },
      tx,
    );
  });
}
