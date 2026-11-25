"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { DocumentKind } from "@avrupadasat/db";
import { uploadDocument } from "@/server/documents";
import { MAX_UPLOAD_BYTES } from "@/server/files";
import { inviteMember, removeMember } from "@/server/members";
import { clientIp, requireClient } from "@/server/session";
import { createAsn, importCatalog, parseAsnLines } from "@/server/shipments";

export type PanelState = { ok?: string; error?: string; errors?: string[] } | undefined;

async function fileText(fd: FormData, field: string): Promise<string | null> {
  const f = fd.get(field);
  if (f instanceof File && f.size > 0) {
    if (f.size > 2 * 1024 * 1024) throw new Error("CSV en fazla 2 MB olabilir");
    return f.text();
  }
  return null;
}

export async function createAsnAction(_: PanelState, fd: FormData): Promise<PanelState> {
  const s = await requireClient("asn.write");
  let text: string;
  try {
    text = (await fileText(fd, "linesFile")) ?? String(fd.get("lines") ?? "");
  } catch (e) {
    return { error: (e as Error).message };
  }
  const parsed = parseAsnLines(text);
  if (parsed.errors.length) return { error: "Ürün satırlarında hata var", errors: parsed.errors };
  let id: string;
  try {
    const sh = await createAsn(
      s.actor.tenantId,
      {
        reference: String(fd.get("reference") ?? ""),
        origin: String(fd.get("origin") ?? "") || undefined,
        carrier: String(fd.get("carrier") ?? "") || undefined,
        expectedAt: fd.get("expectedAt") ? new Date(String(fd.get("expectedAt"))) : undefined,
        pallets: Number(fd.get("pallets") ?? 0),
        cartons: Number(fd.get("cartons") ?? 0),
        lines: parsed.lines,
      },
      s.userId,
    );
    id = sh.id;
  } catch (e) {
    if (e instanceof z.ZodError)
      return {
        error: "Formdaki alanları kontrol edin",
        errors: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      };
    return { error: (e as Error).message };
  }
  redirect(`/panel/sevkiyatlar/${id}`);
}

const kinds = [
  "TICARI_FATURA",
  "CEKI_LISTESI",
  "ATR",
  "CMR",
  "CE_BEYAN",
  "SIRKET",
  "DIGER",
] as const;

export async function uploadDocAction(_: PanelState, fd: FormData): Promise<PanelState> {
  const s = await requireClient("document.write");
  const f = fd.get("file");
  if (!(f instanceof File) || f.size === 0) return { error: "Dosya seçin" };
  if (f.size > MAX_UPLOAD_BYTES) return { error: "Dosya 10 MB'tan büyük olamaz" };
  const kind = z.enum(kinds).safeParse(fd.get("kind"));
  if (!kind.success) return { error: "Belge türü seçin" };
  const shipmentId = String(fd.get("shipmentId") ?? "") || null;
  const r = await uploadDocument({
    tenantId: s.actor.tenantId,
    shipmentId,
    kind: kind.data as DocumentKind,
    filename: f.name,
    data: Buffer.from(await f.arrayBuffer()),
    actorUserId: s.userId,
    ip: await clientIp(),
  });
  if (!r.ok) return { error: r.reason };
  revalidatePath(shipmentId ? `/panel/sevkiyatlar/${shipmentId}` : "/panel/belgeler");
  return { ok: "Belge yüklendi." };
}

export async function importCatalogAction(_: PanelState, fd: FormData): Promise<PanelState> {
  const s = await requireClient("catalog.write");
  let text: string;
  try {
    text = (await fileText(fd, "file")) ?? String(fd.get("csv") ?? "");
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!text.trim()) return { error: "CSV dosyası seçin veya yapıştırın" };
  const r = await importCatalog(s.actor.tenantId, text, s.userId);
  revalidatePath("/panel/stok");
  return {
    ok: `${r.created} ürün eklendi, ${r.updated} ürün güncellendi.`,
    errors: r.errors.slice(0, 20),
  };
}

export async function inviteMemberAction(_: PanelState, fd: FormData): Promise<PanelState> {
  const s = await requireClient("user.manage");
  const r = await inviteMember(
    s.actor.tenantId,
    { email: String(fd.get("email") ?? ""), name: String(fd.get("name") ?? "") },
    s.userId,
  );
  revalidatePath("/panel/kullanicilar");
  return r.ok ? { ok: "Davet gönderildi." } : { error: r.reason };
}

export async function removeMemberAction(fd: FormData) {
  const s = await requireClient("user.manage");
  await removeMember(s.actor.tenantId, String(fd.get("userId") ?? ""), s.userId);
  revalidatePath("/panel/kullanicilar");
}
