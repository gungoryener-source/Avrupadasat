import { registrationSteps } from "@avrupadasat/core/events";
import {
  buildQuoteLines,
  PRICE_LIST_VERSION,
  quoteTotals,
  type CompanyForm,
  type PackageCode,
  type QuoteLine,
} from "@avrupadasat/core/pricing";
import { encryptField } from "@avrupadasat/db/crypto";
import { Prisma, type Quote } from "@avrupadasat/db";
import { audit } from "./audit";
import { issueToken } from "./auth";
import { db } from "./db";
import { emit } from "./outbox";
import { slugify } from "./slug";
import { randomToken, sha256 } from "./tokens";

export const TERMS_VERSION = "2026-11-taslak";
export const QUOTE_VALID_DAYS = 30;

export const QUOTE_STATUS_LABEL = {
  DRAFT: "Taslak",
  SENT: "Gönderildi",
  ACCEPTED: "Onaylandı",
  REJECTED: "Reddedildi",
  EXPIRED: "Süresi doldu",
} as const;

async function nextNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `AS-${year}-`;
  const last = await tx.quote.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });
  const n = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

export async function createQuote(args: {
  leadId: string;
  packageCode: PackageCode;
  companyForm: CompanyForm;
  pallets?: number;
  actorUserId: string;
}): Promise<Quote> {
  const lines = buildQuoteLines(args.packageCode, args.companyForm, args.pallets);
  const totals = quoteTotals(lines);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db().$transaction(async (tx) => {
        const lead = await tx.lead.findUniqueOrThrow({ where: { id: args.leadId } });
        const q = await tx.quote.create({
          data: {
            number: await nextNumber(tx),
            leadId: lead.id,
            packageCode: args.packageCode,
            companyForm: args.companyForm,
            lines: lines as unknown as Prisma.InputJsonValue,
            ...totals,
            priceListVersion: PRICE_LIST_VERSION,
            validUntil: new Date(Date.now() + QUOTE_VALID_DAYS * 86_400_000),
            createdById: args.actorUserId,
          },
        });
        if (lead.status !== "WON")
          await tx.lead.update({ where: { id: lead.id }, data: { status: "QUOTED" } });
        await audit(
          {
            actorUserId: args.actorUserId,
            action: "quote.created",
            entity: "Quote",
            entityId: q.id,
            meta: { number: q.number },
          },
          tx,
        );
        return q;
      });
    } catch (e) {
      // Eşzamanlı numara çakışması: yeniden dene
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("Teklif numarası üretilemedi");
}

/** Teklifi gönderir: tek kullanımlık olmayan, tahmin edilemez bağlantı üretir (onaya kadar geçerli) */
export async function sendQuote(quoteId: string, actorUserId: string): Promise<string> {
  const token = randomToken();
  await db().$transaction(async (tx) => {
    const q = await tx.quote.findUniqueOrThrow({ where: { id: quoteId }, include: { lead: true } });
    if (q.status === "ACCEPTED") throw new Error("Onaylanmış teklif yeniden gönderilemez");
    if (!q.lead) throw new Error("Teklifin bağlı talebi yok");
    await tx.quote.update({
      where: { id: q.id },
      data: { status: "SENT", sentAt: new Date(), publicTokenHash: sha256(token) },
    });
    await emit(tx, "quote.sent.v1", {
      quoteId: q.id,
      number: q.number,
      email: q.lead.email,
      tokenEnc: encryptField(token),
    });
    await audit({ actorUserId, action: "quote.sent", entity: "Quote", entityId: q.id }, tx);
  });
  return token;
}

export async function quoteByToken(token: string) {
  if (!token || token.length > 100) return null;
  const q = await db().quote.findUnique({
    where: { publicTokenHash: sha256(token) },
    include: { lead: true },
  });
  if (!q) return null;
  if (q.status === "SENT" && q.validUntil < new Date()) {
    return { ...q, status: "EXPIRED" as const };
  }
  return q;
}

export function linesOf(q: Pick<Quote, "lines">): QuoteLine[] {
  return q.lines as unknown as QuoteLine[];
}

export type AcceptResult = { ok: true; tenantId: string } | { ok: false; reason: string };

/**
 * Teklif onayı: tek işlemde firma (tenant), sözleşme kaydı, sahip kullanıcı,
 * kuruluş adımları ve olaylar oluşturulur. Ardından davet bağlantısı gönderilir.
 */
export async function acceptQuote(
  token: string,
  signerName: string,
  ip: string | null,
): Promise<AcceptResult> {
  const name = signerName.trim();
  if (name.length < 3 || name.length > 120) return { ok: false, reason: "Ad soyad yazın" };
  const q = await quoteByToken(token);
  if (!q || !q.lead) return { ok: false, reason: "Teklif bulunamadı" };
  if (q.status !== "SENT")
    return {
      ok: false,
      reason: q.status === "ACCEPTED" ? "Bu teklif zaten onaylandı" : "Bu teklif artık onaylanamaz",
    };
  const lead = q.lead;

  const existing = await db().user.findUnique({ where: { email: lead.email } });
  if (existing?.staffRole)
    return { ok: false, reason: "Bu e-posta ekip hesabına ait; lütfen bizimle iletişime geçin" };

  const result = await db()
    .$transaction(async (tx) => {
      // Yarış durumu: durum SENT iken koşullu güncelle
      const upd = await tx.quote.updateMany({
        where: { id: q.id, status: "SENT" },
        data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedByName: name, acceptedIp: ip },
      });
      if (upd.count !== 1) throw new Error("ALREADY");

      const baseSlug = slugify(lead.companyName) || "firma";
      const clash = await tx.tenant.count({ where: { slug: { startsWith: baseSlug } } });
      const tenant = await tx.tenant.create({
        data: {
          name: lead.companyName,
          slug: clash ? `${baseSlug}-${clash + 1}` : baseSlug,
          packageCode: q.packageCode,
          status: "ONBOARDING",
        },
      });
      await tx.quote.update({ where: { id: q.id }, data: { tenantId: tenant.id } });
      await tx.lead.update({
        where: { id: lead.id },
        data: { status: "WON", tenantId: tenant.id },
      });
      await tx.contract.create({
        data: {
          tenantId: tenant.id,
          quoteId: q.id,
          termsVersion: TERMS_VERSION,
          signerName: name,
          signerEmail: lead.email,
          signerIp: ip,
        },
      });
      await tx.tenantContact.create({
        data: { tenantId: tenant.id, name, email: lead.email, phone: lead.phone, isPrimary: true },
      });
      const user = existing ?? (await tx.user.create({ data: { email: lead.email, name } }));
      await tx.membership.create({
        data: { userId: user.id, tenantId: tenant.id, role: "CLIENT_OWNER" },
      });
      if (q.companyForm !== "NONE") {
        await tx.registrationTask.createMany({
          data: registrationSteps.map((step) => ({ tenantId: tenant.id, step })),
        });
      } else {
        await tx.registrationTask.createMany({
          data: (["EORI", "LUCID"] as const).map((step) => ({ tenantId: tenant.id, step })),
        });
      }
      await emit(
        tx,
        "quote.accepted.v1",
        { quoteId: q.id, packageCode: q.packageCode },
        { tenantId: tenant.id, idempotencyKey: `quote.accepted:${q.id}` },
      );
      await audit(
        {
          action: "quote.accepted",
          entity: "Quote",
          entityId: q.id,
          tenantId: tenant.id,
          meta: { signer: "kayıtlı" },
          ip,
        },
        tx,
      );
      await audit(
        {
          action: "tenant.created",
          entity: "Tenant",
          entityId: tenant.id,
          tenantId: tenant.id,
          ip,
        },
        tx,
      );
      return { tenantId: tenant.id, userId: user.id, needsInvite: !existing?.passwordHash };
    })
    .catch((e: unknown) => {
      if (e instanceof Error && e.message === "ALREADY") return null;
      throw e;
    });
  if (!result) return { ok: false, reason: "Bu teklif zaten onaylandı" };
  if (result.needsInvite) await issueToken(result.userId, "INVITE");
  return { ok: true, tenantId: result.tenantId };
}
