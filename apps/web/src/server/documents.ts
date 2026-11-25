import type { DocumentKind } from "@avrupadasat/db";
import { forTenant } from "@avrupadasat/db";
import { audit } from "./audit";
import { db } from "./db";
import { detectType, MAX_UPLOAD_BYTES, sanitizeFilename, scanBuffer, sha256Buf } from "./files";
import { putObject } from "./storage";

export const DOC_KIND_LABEL: Record<DocumentKind, string> = {
  TICARI_FATURA: "Ticari fatura",
  CEKI_LISTESI: "Çeki listesi",
  ATR: "A.TR dolaşım belgesi",
  CMR: "CMR",
  CE_BEYAN: "CE uygunluk beyanı",
  SIRKET: "Şirket belgesi",
  DIGER: "Diğer",
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
}): Promise<UploadResult> {
  if (args.data.length === 0) return { ok: false, reason: "Dosya boş" };
  if (args.data.length > MAX_UPLOAD_BYTES)
    return { ok: false, reason: "Dosya 10 MB'tan büyük olamaz" };
  const type = detectType(args.data);
  if (!type)
    return { ok: false, reason: "Desteklenmeyen dosya türü (PDF, PNG, JPG, XLSX, DOCX, CSV)" };
  const t = forTenant(db(), args.tenantId);
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
      kind: args.kind,
      filename: sanitizeFilename(args.filename, type.ext),
      mime: type.mime,
      size: args.data.length,
      sha256: sha256Buf(args.data),
      storageKey,
      scanStatus: scan,
      uploadedById: args.actorUserId,
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
