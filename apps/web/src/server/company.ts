/**
 * Şirket profili ve vergi takvimi.
 * Resmî alanları (unvan, sicil, vergi no) yalnız ekip günceller; müşteri değişiklik TALEP eder.
 * Vergi takvimi bilgilendirme amaçlıdır; beyanları vergi danışmanı iş ortağı verir.
 */
import { z } from "zod";
import { can, canAccessTenant, type Actor } from "@avrupadasat/core/roles";
import {
  decryptField,
  encryptField,
  forTenant,
  maskTail,
  type Prisma,
  type WorkStatus,
} from "@avrupadasat/db";
import { audit } from "./audit";
import { db } from "./db";
import { notifyTenant } from "./notifications";

export const COMPANY_FORM_LABEL = {
  UG: "UG (haftungsbeschränkt)",
  GMBH: "GmbH",
  NONE: "Türk şirketi (Almanya'da şube/şirket yok)",
} as const;

export type Representative = { name: string; role: string };

export async function getCompany(tenantId: string, opts: { revealTax?: boolean } = {}) {
  const t = await db().tenant.findUniqueOrThrow({ where: { id: tenantId } });
  let taxNumber: string | null = null;
  if (t.taxNumberEnc) {
    const plain = decryptField(t.taxNumberEnc);
    taxNumber = opts.revealTax ? plain : maskTail(plain);
  }
  const reps = Array.isArray(t.representatives) ? (t.representatives as Representative[]) : [];
  return {
    id: t.id,
    name: t.name,
    legalName: t.legalName,
    companyForm: t.companyForm,
    registerNumber: t.registerNumber,
    registerCourt: t.registerCourt,
    businessAddress: t.businessAddress,
    vatId: t.vatId,
    taxNumber,
    registeredAt: t.registeredAt,
    status: t.status,
    packageCode: t.packageCode,
    representatives: reps,
    city: t.city,
  };
}

const VAT_RE = /^DE\d{9}$/;

const companyInput = z.object({
  legalName: z.string().trim().max(200).optional(),
  companyForm: z.enum(["UG", "GMBH", "NONE"]).optional(),
  registerNumber: z.string().trim().max(40).optional(),
  registerCourt: z.string().trim().max(80).optional(),
  businessAddress: z.string().trim().max(300).optional(),
  vatId: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, "").toUpperCase())
    .refine((v) => v === "" || VAT_RE.test(v), "USt-IdNr. biçimi: DE + 9 rakam")
    .optional(),
  taxNumber: z.string().trim().max(30).optional(),
  registeredAt: z.union([z.literal(""), z.coerce.date()]).optional(),
  status: z.enum(["ONBOARDING", "ACTIVE", "PAUSED", "CLOSED"]).optional(),
  representatives: z
    .array(z.object({ name: z.string().trim().min(2).max(120), role: z.string().trim().max(80) }))
    .max(10)
    .optional(),
});

/** Ekip: şirket profilini günceller (tenant.manage) */
export async function updateCompany(
  actor: Actor,
  tenantId: string,
  input: unknown,
  ip?: string | null,
) {
  if (!can(actor.role, "tenant.manage") || !canAccessTenant(actor, tenantId))
    return { ok: false as const, error: "Yetki yok" };
  const p = companyInput.safeParse(input);
  if (!p.success) {
    const fe: Record<string, string> = {};
    for (const i of p.error.issues) fe[String(i.path[0])] ??= i.message;
    return { ok: false as const, error: "Formu kontrol edin", fieldErrors: fe };
  }
  const d = p.data;
  const data: Prisma.TenantUpdateInput = {};
  for (const k of [
    "legalName",
    "registerNumber",
    "registerCourt",
    "businessAddress",
    "vatId",
  ] as const)
    if (d[k] !== undefined) data[k] = d[k] || null;
  if (d.companyForm) data.companyForm = d.companyForm;
  if (d.status) data.status = d.status;
  if (d.registeredAt !== undefined)
    data.registeredAt = d.registeredAt === "" ? null : d.registeredAt;
  if (d.taxNumber !== undefined) data.taxNumberEnc = d.taxNumber ? encryptField(d.taxNumber) : null;
  if (d.representatives) data.representatives = d.representatives;
  await db().tenant.update({ where: { id: tenantId }, data });
  await audit({
    actorUserId: actor.userId,
    tenantId,
    action: "company.updated",
    entity: "Tenant",
    entityId: tenantId,
    // Vergi numarası değeri loglanmaz
    meta: { fields: Object.keys(d) },
    ip,
  });
  return { ok: true as const };
}

/* ---------------- Vergi takvimi ---------------- */

export const TAX_KIND_LABEL: Record<string, string> = {
  UST_VA: "KDV ön beyanı (USt-Voranmeldung)",
  ZM: "Özet beyan (Zusammenfassende Meldung)",
  UST_JAHR: "Yıllık KDV beyanı",
  JAHRESABSCHLUSS: "Yıllık bilanço",
  DIGER: "Diğer",
};

const filingInput = z.object({
  kind: z.enum(Object.keys(TAX_KIND_LABEL) as [string, ...string[]]),
  period: z
    .string()
    .trim()
    .regex(/^\d{4}(-(0[1-9]|1[0-2]|Q[1-4]))?$/, "Dönem: 2026, 2026-11 veya 2026-Q4"),
  dueAt: z.coerce.date(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "ATTENTION"]).default("PENDING"),
  note: z.string().trim().max(1000).optional(),
});

export async function listFilings(tenantId: string) {
  return forTenant(db(), tenantId).taxFiling.findMany({ orderBy: { dueAt: "desc" }, take: 60 });
}

/** Finans: beyan ekle/güncelle (aynı tür + dönem tekildir) */
export async function upsertFiling(
  actor: Actor,
  tenantId: string,
  input: unknown,
  ip?: string | null,
) {
  if (!can(actor.role, "tax.write") || !canAccessTenant(actor, tenantId))
    return { ok: false as const, error: "Yetki yok" };
  const p = filingInput.safeParse(input);
  if (!p.success) {
    const fe: Record<string, string> = {};
    for (const i of p.error.issues) fe[String(i.path[0])] ??= i.message;
    return { ok: false as const, error: "Formu kontrol edin", fieldErrors: fe };
  }
  const prev = await db().taxFiling.findUnique({
    where: { tenantId_kind_period: { tenantId, kind: p.data.kind, period: p.data.period } },
  });
  const f = await db().taxFiling.upsert({
    where: { tenantId_kind_period: { tenantId, kind: p.data.kind, period: p.data.period } },
    create: {
      tenantId,
      ...p.data,
      status: p.data.status as WorkStatus,
      note: p.data.note || null,
      updatedById: actor.userId,
    },
    update: {
      dueAt: p.data.dueAt,
      status: p.data.status as WorkStatus,
      note: p.data.note || null,
      updatedById: actor.userId,
    },
  });
  await audit({
    actorUserId: actor.userId,
    tenantId,
    action: "tax.updated",
    entity: "TaxFiling",
    entityId: f.id,
    meta: { kind: f.kind, period: f.period, status: f.status },
    ip,
  });
  if (!prev || prev.status !== f.status)
    await notifyTenant(tenantId, {
      type: "tax",
      title: `${TAX_KIND_LABEL[f.kind] ?? f.kind} ${f.period}: ${f.status === "COMPLETED" ? "verildi" : f.status === "ATTENTION" ? "ilgi gerekiyor" : f.status === "IN_PROGRESS" ? "hazırlanıyor" : "planlandı"}`,
      href: "/panel/vergi",
      email: f.status === "ATTENTION",
    });
  return { ok: true as const, id: f.id };
}

/** Bir sonraki ayların aylık KDV ön beyanı son tarihleri (ertesi ayın 10'u) — ekip tek tıkla ekler */
export function nextMonthlyVatDeadlines(from: Date, months = 3) {
  const out: { period: string; dueAt: Date }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, 1));
    const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const due = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 10, 12));
    out.push({ period, dueAt: due });
  }
  return out;
}
