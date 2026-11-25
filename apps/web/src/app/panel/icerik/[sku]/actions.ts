"use server";
import { revalidatePath } from "next/cache";
import { approveContent, generateContent, saveContentInput } from "@/server/content";
import { requireClient } from "@/server/session";

export type CState = { ok?: string; error?: string } | undefined;

const path = (sku: string) => `/panel/icerik/${encodeURIComponent(sku)}`;

export async function saveInputAction(_: CState, fd: FormData): Promise<CState> {
  const s = await requireClient("catalog.write");
  const sku = String(fd.get("sku") ?? "");
  const r = await saveContentInput(
    s.actor.tenantId,
    sku,
    String(fd.get("titleTr") ?? ""),
    String(fd.get("featuresTr") ?? ""),
  );
  revalidatePath(path(sku));
  return r.ok ? { ok: "Kaydedildi." } : { error: r.reason };
}

export async function generateContentAction(_: CState, fd: FormData): Promise<CState> {
  const s = await requireClient("catalog.write");
  const sku = String(fd.get("sku") ?? "");
  const r = await generateContent(s.actor.tenantId, sku);
  revalidatePath(path(sku));
  return r.ok ? { ok: "Taslak hazır; sağdaki alanları kontrol edin." } : { error: r.reason };
}

export async function approveContentAction(_: CState, fd: FormData): Promise<CState> {
  const s = await requireClient("catalog.write");
  const sku = String(fd.get("sku") ?? "");
  const r = await approveContent(
    s.actor.tenantId,
    sku,
    {
      titleDe: String(fd.get("titleDe") ?? ""),
      bulletsDe: String(fd.get("bulletsDe") ?? ""),
      descriptionDe: String(fd.get("descriptionDe") ?? ""),
    },
    s.userId,
  );
  revalidatePath(path(sku));
  revalidatePath("/panel/stok");
  return r.ok ? { ok: "Onaylandı." } : { error: r.reason };
}
