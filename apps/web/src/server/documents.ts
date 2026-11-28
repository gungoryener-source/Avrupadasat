import type { DocReview, DocumentKind, Prisma } from "@avrupadasat/db";
import { forTenant } from "@avrupadasat/db";
import { audit } from "./audit";
import { db } from "./db";
import { detectType, MAX_UPLOAD_BYTES, sanitizeFilename, scanBuffer, sha256Buf } from "./files";
import { notifyStaff, notifyTenant } from "./notifications";
import { putObject } from "./storage";

export const DOC_KIND_LABEL: Record<DocumentKind, string> = {
  TICARI_FATURA: "Ticari fatura",
  CEKI_LISTESI: "Çeki listesi",
  ATR: "A.TR dolaşım belgesi",
  CMR: "CMR",
  CE_BEYAN: "CE uygunluk beyanı",
  SIRKET: "Şirket belgesi",
  VERGI: "Vergi belgesi",
  MUHASEBE: "Muhasebe belgesi",
  SOZLESME: "Sözleşme",
  DIGER: "Diğer",
};

export const DOC_REVIEW_LABEL: Record<DocReview, string> = {
  PENDING: "Onay bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
};

/** Her sevkiyatta beklenen belgeler (eksik belge uyarısı) */
export const REQUIRED_SHIPMENT_DOCS: DocumentKind[] = [
  "TICARI_FATURA",
  "CEKI_LISTESI",
  "ATR",
  "CMR",
];

export type UploadResult = { ok: true; id: string } | { ok: false; reason: string };

export async function uploadDocument(args: {
  tenantId: string;
  shipmentId?: string | null;
  kind: DocumentKind;
  filename: string;
  data: Buffer;
  actorUserId: string;
  ip?: string | null;
  /** Ekip yüklemesi doğrudan onaylı; müşteri yüklemesi onay bekler */
  approved?: boolean;
  expiresAt?: Date | null;
  taskId?: string | null;
  internal?: boolean;
}): Promise<UploadResult> {
  if (args.data.length === 0) return { ok: false, reason: "Dosya boş" };
  if (args.data.length > MAX_UPLOAD_BYTES)
    return { ok: false, reason: "Dosya 10 MB'tan büyük olamaz" };
  const type = detectType(args.data);
  if (!type)
    return { ok: false, reason: "Desteklenmeyen dosya türü (PDF, PNG, JPG, XLSX, DOCX, CSV)" };
  const t = forTenant(db(), args.tenantId);
  if (args.taskId && !(await t.task.findFirst({ where: { id: args.taskId } })))
    return { ok: false, reason: "Görev bulunamadı" };
  if (args.shipmentId) {
    const s = await t.shipment.findFirst({ where: { id: args.shipmentId } });
    if (!s) return { ok: false, reason: "Sevkiyat bulunamadı" };
  }
  const scan = await scanBuffer(args.data);
  if (scan === "infected") {
    await audit({
      actorUserId: args.actorUserId,
      tenantId: args.tenantId,
      action: "document.uploaded",
      entity: "Document",
      meta: { rejected: "virus" },
      ip: args.ip,
    });
    return { ok: false, reason: "Dosyada zararlı içerik tespit edildi; yüklenmedi" };
  }
  const storageKey = await putObject(args.data);
  const doc = await t.document.create({
    data: {
      shipmentId: args.shipmentId ?? null,
      taskId: args.taskId ?? null,
      internal: args.internal ?? false,
      kind: args.kind,
      filename: sanitizeFilename(args.filename, type.ext),
      mime: type.mime,
      size: args.data.length,
      sha256: sha256Buf(args.data),
      storageKey,
      scanStatus: scan,
      uploadedById: args.actorUserId,
      review: args.approved ? "APPROVED" : "PENDING",
      reviewedAt: args.approved ? new Date() : null,
      reviewedById: args.approved ? args.actorUserId : null,
      expiresAt: args.expiresAt ?? null,
    } as never,
  });
  await audit({
    actorUserId: args.actorUserId,
    tenantId: args.tenantId,
    action: "document.uploaded",
    entity: "Document",
    entityId: doc.id,
    meta: { kind: args.kind, scan },
    ip: args.ip,
  });
  return { ok: true, id: doc.id };
}

export function missingDocs(kinds: DocumentKind[]): DocumentKind[] {
  return REQUIRED_SHIPMENT_DOCS.filter((k) => !kinds.includes(k));
}

export interface DocFilter {
  q?: string;
  kind?: DocumentKind;
  review?: DocReview;
  expiring?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "new" | "old" | "name" | "expires";
  /** Ekip görünümü: iç belgeler de listelenir */
  staff?: boolean;
}

function docWhere(f: DocFilter): Prisma.DocumentWhereInput {
  const soon = new Date(Date.now() + 30 * 86400_000);
  return {
    ...(f.kind ? { kind: f.kind } : {}),
    ...(f.review ? { review: f.review } : {}),
    ...(f.expiring ? { expiresAt: { lte: soon } } : {}),
    ...(f.q ? { filename: { contains: f.q, mode: "insensitive" } } : {}),
    // Müşteri listelerinde iç belgeler hiç dönmez; ekip görünümü staff: true ile çağırır
    ...(f.staff ? {} : { internal: false }),
  };
}

const DOC_ORDER: Record<NonNullable<DocFilter["sort"]>, Prisma.DocumentOrderByWithRelationInput> = {
  new: { createdAt: "desc" },
  old: { createdAt: "asc" },
  name: { filename: "asc" },
  expires: { expiresAt: { sort: "asc", nulls: "last" } },
};

/** Firma belgeleri (müşteri kendi firması; ekip seçilen firma) — arama, filtre, sayfalama */
export async function listDocuments(tenantId: string, f: DocFilter = {}) {
  const size = f.pageSize ?? 20;
  const page = Math.max(1, f.page ?? 1);
  const t = forTenant(db(), tenantId);
  const where = docWhere(f);
  const [items, total] = await Promise.all([
    t.document.findMany({
      where,
      orderBy: DOC_ORDER[f.sort ?? "new"],
      take: size,
      skip: (page - 1) * size,
      include: { shipment: { select: { reference: true } } },
    }),
    t.document.count({ where }),
  ]);
  return { items, total, page, pageSize: size };
}

/** Ekip: onay kuyruğu (tüm firmalar) */
export async function listPendingDocuments(f: DocFilter = {}) {
  const size = f.pageSize ?? 25;
  const page = Math.max(1, f.page ?? 1);
  const where = { ...docWhere(f), review: f.review ?? ("PENDING" as DocReview) };
  const [items, total] = await Promise.all([
    db().document.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: size,
      skip: (page - 1) * size,
      include: { tenant: { select: { name: true } } },
    }),
    db().document.count({ where }),
  ]);
  return { items, total, page, pageSize: size };
}

/** Ekip: belgeyi onayla/reddet; müşteriye bildirim */
export async function reviewDocument(args: {
  actorUserId: string;
  id: string;
  decision: "APPROVED" | "REJECTED";
  note?: string;
  expiresAt?: Date | null;
  ip?: string | null;
}) {
  const doc = await db().document.findUnique({ where: { id: args.id } });
  if (!doc) return { ok: false as const, error: "Belge bulunamadı" };
  if (args.decision === "REJECTED" && !args.note?.trim())
    return { ok: false as const, error: "Ret nedeni yazın; müşteri bu açıklamayı görür" };
  await db().document.update({
    where: { id: args.id },
    data: {
      review: args.decision,
      reviewNote: args.note?.trim() || null,
      reviewedById: args.actorUserId,
      reviewedAt: new Date(),
      ...(args.expiresAt !== undefined ? { expiresAt: args.expiresAt } : {}),
    },
  });
  await audit({
    actorUserId: args.actorUserId,
    tenantId: doc.tenantId,
    action: "document.reviewed",
    entity: "Document",
    entityId: doc.id,
    meta: { decision: args.decision },
    ip: args.ip,
  });
  await notifyTenant(doc.tenantId, {
    type: "document",
    title:
      args.decision === "APPROVED"
        ? `Belge onaylandı: ${doc.filename}`
        : `Belge reddedildi: ${doc.filename}`,
    body: args.note?.trim() || undefined,
    href: "/panel/belgeler",
    email: args.decision === "REJECTED",
  });
  return { ok: true as const };
}

/** Müşteri yüklemesi sonrası ekibe haber (onay kuyruğu) */
export async function notifyDocumentUploaded(tenantId: string, filename: string) {
  await notifyStaff("document.review", {
    type: "document",
    tenantId,
    title: `Onay bekleyen belge: ${filename}`,
    href: "/admin/belgeler",
  });
}
