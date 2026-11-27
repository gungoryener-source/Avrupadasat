"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { packages } from "@avrupadasat/core/pricing";
import { forTenant } from "@avrupadasat/db";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { uploadDocument } from "@/server/documents";
import { markRead, notifyStaff } from "@/server/notifications";
import { clientIp, requireClient } from "@/server/session";
import { customerMarkDone } from "@/server/tasks";
import { createTicket, replyTicket } from "@/server/tickets";

export type FormState =
  { ok?: string; error?: string; fieldErrors?: Record<string, string> } | undefined;

/** İsteğe bağlı ek dosya → Belgelerim'e (onay bekler) kaydedilir, id döner */
async function attach(fd: FormData, tenantId: string, userId: string) {
  const f = fd.get("file");
  if (!(f instanceof File) || f.size === 0) return { id: undefined as string | undefined };
  const r = await uploadDocument({
    tenantId,
    kind: "DIGER",
    filename: f.name,
    data: Buffer.from(await f.arrayBuffer()),
    actorUserId: userId,
    ip: await clientIp(),
  });
  if (!r.ok) return { error: r.reason };
  return { id: r.id };
}

export async function createTicketAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireClient("ticket.write");
  const a = await attach(fd, s.actor.tenantId, s.userId);
  if ("error" in a && a.error) return { error: a.error };
  const r = await createTicket(
    s.actor,
    s.actor.tenantId,
    {
      subject: fd.get("subject"),
      category: fd.get("category"),
      priority: fd.get("priority") || "NORMAL",
      body: fd.get("body"),
      documentId: a.id,
    },
    await clientIp(),
  );
  if (!r.ok) return { error: r.error, fieldErrors: r.fieldErrors };
  redirect(`/panel/destek/${r.id}?yeni=1`);
}

export async function replyTicketAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireClient("ticket.write");
  const id = String(fd.get("id") ?? "");
  const a = await attach(fd, s.actor.tenantId, s.userId);
  if ("error" in a && a.error) return { error: a.error };
  const r = await replyTicket(
    s.actor,
    id,
    { body: fd.get("body"), documentId: a.id },
    await clientIp(),
  );
  if (!r.ok) return { error: r.error, fieldErrors: r.fieldErrors };
  revalidatePath(`/panel/destek/${id}`);
  return { ok: "Mesajınız gönderildi." };
}

export async function taskDoneAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireClient("task.read");
  const r = await customerMarkDone(
    s.actor,
    String(fd.get("id") ?? ""),
    String(fd.get("note") ?? ""),
    await clientIp(),
  );
  if (!r.ok) return { error: r.error };
  revalidatePath("/panel");
  // Form görevden kalktığı için onay mesajı sayfada gösterilir
  redirect("/panel/gorevler?bildirildi=1");
}

export async function readNotificationsAction(fd: FormData) {
  const s = await requireClient();
  const id = String(fd.get("id") ?? "") || undefined;
  await markRead(s.actor.userId, id);
  revalidatePath("/panel", "layout");
}

const changeInput = z.object({
  field: z.string().trim().min(2).max(80),
  value: z.string().trim().min(2, "Yeni değeri yazın").max(500),
  reason: z.string().trim().max(1000).optional(),
});

/** Resmî şirket bilgisi değişikliği müşteri tarafından doğrudan yapılmaz: destek talebi açılır */
export async function requestCompanyChangeAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireClient("ticket.write");
  const p = changeInput.safeParse({
    field: fd.get("field"),
    value: fd.get("value"),
    reason: fd.get("reason") || undefined,
  });
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Formu kontrol edin" };
  const r = await createTicket(
    s.actor,
    s.actor.tenantId,
    {
      subject: `Şirket bilgisi değişikliği: ${p.data.field}`,
      category: "SIRKET",
      body: `Alan: ${p.data.field}\nYeni değer: ${p.data.value}${p.data.reason ? `\nAçıklama: ${p.data.reason}` : ""}`,
    },
    await clientIp(),
  );
  if (!r.ok) return { error: r.error };
  revalidatePath("/panel/sirketim");
  return { ok: `Talebiniz alındı (#${r.number}). Değişiklik ekip onayıyla işlenir.` };
}

/** Paket değişikliği talebi — ödeme alınmaz; ekip onaylayıp sözleşmeyi günceller */
export async function requestPlanChangeAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireClient("subscription.request");
  const code = z.enum(["BASLANGIC", "OPERASYON", "PAZARA_GIRIS"]).safeParse(fd.get("plan"));
  if (!code.success) return { error: "Paket seçin" };
  const tenant = await db().tenant.findUniqueOrThrow({ where: { id: s.actor.tenantId } });
  if (tenant.packageCode === code.data) return { error: "Zaten bu paketi kullanıyorsunuz" };
  const r = await createTicket(
    s.actor,
    s.actor.tenantId,
    {
      subject: `Paket değişikliği talebi: ${packages[code.data].name}`,
      category: "FATURA",
      body: `Mevcut paket: ${tenant.packageCode ? packages[tenant.packageCode as keyof typeof packages].name : "yok"}\nİstenen paket: ${packages[code.data].name}\n${String(fd.get("note") ?? "").slice(0, 1000)}`,
    },
    await clientIp(),
  );
  if (!r.ok) return { error: r.error };
  await audit({
    actorUserId: s.userId,
    tenantId: s.actor.tenantId,
    action: "subscription.requested",
    entity: "Tenant",
    entityId: s.actor.tenantId,
    meta: { to: code.data },
  });
  await notifyStaff("subscription.manage", {
    type: "subscription",
    tenantId: s.actor.tenantId,
    title: `Paket değişikliği talebi: ${tenant.name} → ${packages[code.data].name}`,
    href: `/admin/destek/${r.id}`,
  });
  revalidatePath("/panel/abonelik");
  return { ok: `Talebiniz alındı (#${r.number}). Ekibimiz koşulları teyit edip size dönecek.` };
}

/** Düşük stok eşiği (müşteri kendi ürünü için belirler) */
export async function lowStockAction(fd: FormData) {
  const s = await requireClient("catalog.write");
  const sku = String(fd.get("sku") ?? "");
  const raw = String(fd.get("lowStockAt") ?? "").trim();
  const n = raw === "" ? null : Number(raw);
  if (n !== null && (!Number.isInteger(n) || n < 0 || n > 1_000_000)) return;
  await forTenant(db(), s.actor.tenantId).stockItem.updateMany({
    where: { sku },
    data: { lowStockAt: n },
  });
  revalidatePath("/panel/stok");
}
