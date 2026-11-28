"use server";
/**
 * Ekip paneli işlemleri: destek, görev, belge onayı, vergi takvimi, şirket profili,
 * abonelik, personel. Her işlem sunucuda yetki + kiracı erişimi kontrol eder;
 * iş kuralları server/* modüllerindedir (arayüz yalnız çağırır).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canAccessTenant, type Permission } from "@avrupadasat/core/roles";
import type { DocumentKind } from "@avrupadasat/db";
import { upsertFiling, nextMonthlyVatDeadlines, updateCompany } from "@/server/company";
import { db } from "@/server/db";
import { DOC_KIND_LABEL, reviewDocument, uploadDocument } from "@/server/documents";
import { markRead } from "@/server/notifications";
import { clientIp, requireStaff } from "@/server/session";
import { changePackage, changeStaffRole, inviteStaff, setStaffDisabled } from "@/server/staff";
import { adjustStock, setLocation, setProductImage } from "@/server/stock";
import { createTask, updateTask } from "@/server/tasks";
import { createTicket, replyTicket, updateTicket } from "@/server/tickets";

export type FormState =
  { ok?: string; error?: string; fieldErrors?: Record<string, string> } | undefined;

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
const opt = (fd: FormData, k: string) => str(fd, k).trim() || undefined;
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "1";

async function staffFor(permission: Permission, tenantId: string) {
  const s = await requireStaff(permission);
  if (!canAccessTenant(s.actor, tenantId)) redirect("/admin?hata=yetki");
  return s;
}

function refreshTenant(tenantId: string) {
  revalidatePath(`/admin/musteriler/${tenantId}`);
}

/* ---------- Destek ---------- */

export async function staffReplyTicketAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireStaff("ticket.write");
  const id = str(fd, "id");
  const r = await replyTicket(
    s.actor,
    id,
    { body: fd.get("body"), internal: bool(fd, "internal") },
    await clientIp(),
  );
  if (!r.ok) return { error: r.error, fieldErrors: r.fieldErrors };
  revalidatePath(`/admin/destek/${id}`);
  return { ok: bool(fd, "internal") ? "İç not eklendi (müşteri görmez)." : "Yanıt gönderildi." };
}

export async function staffUpdateTicketAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireStaff("ticket.write");
  const id = str(fd, "id");
  const assignee = str(fd, "assigneeId");
  const r = await updateTicket(
    s.actor,
    id,
    {
      status: opt(fd, "status"),
      priority: opt(fd, "priority"),
      assigneeId: assignee === "" ? null : assignee,
    },
    await clientIp(),
  );
  if (!r.ok) return { error: r.error };
  revalidatePath(`/admin/destek/${id}`);
  revalidatePath("/admin/destek");
  return { ok: "Talep güncellendi." };
}

export async function staffCreateTicketAction(_: FormState, fd: FormData): Promise<FormState> {
  const tenantId = str(fd, "tenantId");
  const s = await staffFor("ticket.write", tenantId);
  const r = await createTicket(
    s.actor,
    tenantId,
    {
      subject: fd.get("subject"),
      category: fd.get("category"),
      priority: fd.get("priority") || "NORMAL",
      body: fd.get("body"),
    },
    await clientIp(),
  );
  if (!r.ok) return { error: r.error, fieldErrors: r.fieldErrors };
  redirect(`/admin/destek/${r.id}`);
}

/* ---------- Görevler ---------- */

function taskFields(fd: FormData) {
  const due = str(fd, "dueAt");
  return {
    title: fd.get("title") ?? undefined,
    description: opt(fd, "description"),
    category: opt(fd, "category"),
    assigneeId: opt(fd, "assigneeId"),
    dueAt: due ? due : undefined,
    priority: opt(fd, "priority"),
    customerVisible: bool(fd, "customerVisible"),
    customerAction: bool(fd, "customerAction"),
    customerUpdate: opt(fd, "customerUpdate"),
    internalNote: opt(fd, "internalNote"),
  };
}

export async function createTaskAction(_: FormState, fd: FormData): Promise<FormState> {
  const tenantId = str(fd, "tenantId");
  if (!tenantId) return { error: "Firma seçin", fieldErrors: { tenantId: "Firma seçin" } };
  const s = await staffFor("task.write", tenantId);
  const r = await createTask(s.actor, tenantId, taskFields(fd), await clientIp());
  if (!r.ok) return { error: r.error, fieldErrors: r.fieldErrors };
  revalidatePath("/admin/gorevler");
  refreshTenant(tenantId);
  return { ok: "Görev oluşturuldu." };
}

export async function updateTaskAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireStaff("task.write");
  const id = str(fd, "id");
  const input: Record<string, unknown> = { status: opt(fd, "status") };
  // Yalnız formda bulunan alanlar güncellenir (hızlı durum formu ile tam form ayrı)
  for (const k of ["customerUpdate", "internalNote", "assigneeId", "priority"])
    if (fd.has(k)) input[k] = k === "priority" ? opt(fd, k) : str(fd, k).trim();
  if (fd.has("dueAt")) input.dueAt = str(fd, "dueAt") || undefined;
  if (fd.has("customerActionField")) input.customerAction = bool(fd, "customerAction");
  const r = await updateTask(s.actor, id, input, await clientIp());
  if (!r.ok) return { error: r.error, fieldErrors: r.fieldErrors };
  revalidatePath("/admin/gorevler");
  const t = await db().task.findUnique({ where: { id }, select: { tenantId: true } });
  if (t) refreshTenant(t.tenantId);
  const back = str(fd, "back");
  if (/^\/admin\/[\w/?=&%-]*$/.test(back))
    redirect(`${back}${back.includes("?") ? "&" : "?"}sonuc=gorev`);
  return { ok: "Görev güncellendi." };
}

/* ---------- Belgeler ---------- */

export async function reviewDocAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireStaff("document.review");
  const decision = z.enum(["APPROVED", "REJECTED"]).safeParse(fd.get("decision"));
  if (!decision.success) return { error: "Karar seçin" };
  const exp = str(fd, "expiresAt");
  const r = await reviewDocument({
    actorUserId: s.userId,
    id: str(fd, "id"),
    decision: decision.data,
    note: opt(fd, "note"),
    expiresAt: exp ? new Date(`${exp}T12:00:00Z`) : undefined,
    ip: await clientIp(),
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin", "layout");
  // Karar verilen satır kuyruktan çıktığı için sonuç sayfa üstünde gösterilir
  const back = str(fd, "back");
  const safe = /^\/admin\/[\w/?=&%-]*$/.test(back) ? back : "/admin/belgeler";
  redirect(
    `${safe}${safe.includes("?") ? "&" : "?"}sonuc=${decision.data === "APPROVED" ? "onay" : "ret"}`,
  );
}

export async function staffUploadDocAction(_: FormState, fd: FormData): Promise<FormState> {
  const tenantId = str(fd, "tenantId");
  const s = await staffFor("document.review", tenantId);
  const f = fd.get("file");
  if (!(f instanceof File) || f.size === 0) return { error: "Dosya seçin" };
  const kind = z
    .enum(Object.keys(DOC_KIND_LABEL) as [DocumentKind, ...DocumentKind[]])
    .safeParse(fd.get("kind"));
  if (!kind.success) return { error: "Belge türü seçin" };
  const exp = str(fd, "expiresAt");
  const r = await uploadDocument({
    tenantId,
    kind: kind.data,
    filename: f.name,
    data: Buffer.from(await f.arrayBuffer()),
    actorUserId: s.userId,
    ip: await clientIp(),
    approved: true,
    expiresAt: exp ? new Date(`${exp}T12:00:00Z`) : null,
  });
  if (!r.ok) return { error: r.reason };
  refreshTenant(tenantId);
  return { ok: "Belge yüklendi ve müşterinin Belgelerim sayfasına eklendi." };
}

/* ---------- Vergi ---------- */

export async function upsertFilingAction(_: FormState, fd: FormData): Promise<FormState> {
  const tenantId = str(fd, "tenantId");
  const s = await staffFor("tax.write", tenantId);
  const r = await upsertFiling(
    s.actor,
    tenantId,
    {
      kind: fd.get("kind"),
      period: fd.get("period"),
      dueAt: fd.get("dueAt"),
      status: fd.get("status") || "PENDING",
      note: opt(fd, "note"),
    },
    await clientIp(),
  );
  if (!r.ok) return { error: r.error, fieldErrors: r.fieldErrors };
  revalidatePath("/admin/vergi");
  refreshTenant(tenantId);
  const back = str(fd, "back");
  if (/^\/admin\/[\w/?=&%-]*$/.test(back))
    redirect(`${back}${back.includes("?") ? "&" : "?"}sonuc=beyan`);
  return { ok: "Beyan kaydedildi." };
}

/** Önümüzdeki 3 ayın aylık KDV ön beyanı satırlarını ekler (varsa dokunmaz) */
export async function addVatDeadlinesAction(_: FormState, fd: FormData): Promise<FormState> {
  const tenantId = str(fd, "tenantId");
  const s = await staffFor("tax.write", tenantId);
  const ip = await clientIp();
  let added = 0;
  for (const d of nextMonthlyVatDeadlines(new Date(), 3)) {
    const exists = await db().taxFiling.findUnique({
      where: { tenantId_kind_period: { tenantId, kind: "UST_VA", period: d.period } },
    });
    if (exists) continue;
    const r = await upsertFiling(
      s.actor,
      tenantId,
      { kind: "UST_VA", period: d.period, dueAt: d.dueAt, status: "PENDING" },
      ip,
    );
    if (r.ok) added++;
  }
  revalidatePath("/admin/vergi");
  refreshTenant(tenantId);
  return { ok: added ? `${added} dönem eklendi.` : "Bu dönemler zaten takvimde." };
}

/* ---------- Şirket profili ---------- */

export async function updateCompanyAction(_: FormState, fd: FormData): Promise<FormState> {
  const tenantId = str(fd, "tenantId");
  const s = await staffFor("tenant.manage", tenantId);
  const reps: { name: string; role: string }[] = [];
  for (let i = 0; i < 4; i++) {
    const name = str(fd, `rep${i}name`).trim();
    if (name) reps.push({ name, role: str(fd, `rep${i}role`).trim() });
  }
  const input: Record<string, unknown> = {
    legalName: str(fd, "legalName"),
    companyForm: opt(fd, "companyForm"),
    registerNumber: str(fd, "registerNumber"),
    registerCourt: str(fd, "registerCourt"),
    businessAddress: str(fd, "businessAddress"),
    vatId: str(fd, "vatId"),
    registeredAt: str(fd, "registeredAt"),
    representatives: reps,
  };
  // Vergi numarası maskeli gösterilir; boş bırakılırsa mevcut değer korunur
  const tax = str(fd, "taxNumber").trim();
  if (tax) input.taxNumber = tax;
  const r = await updateCompany(s.actor, tenantId, input, await clientIp());
  if (!r.ok) return { error: r.error, fieldErrors: r.fieldErrors };
  refreshTenant(tenantId);
  revalidatePath("/admin/sirket-islemleri");
  return { ok: "Şirket bilgileri kaydedildi." };
}

/* ---------- Abonelik ---------- */

export async function changePackageAction(_: FormState, fd: FormData): Promise<FormState> {
  const tenantId = str(fd, "tenantId");
  const s = await staffFor("subscription.manage", tenantId);
  const r = await changePackage(
    s.actor,
    tenantId,
    str(fd, "packageCode"),
    str(fd, "note"),
    await clientIp(),
  );
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/abonelikler");
  refreshTenant(tenantId);
  return { ok: "Paket güncellendi; müşteriye bildirildi. Ödeme alınmadı." };
}

/* ---------- Personel ---------- */

export async function inviteStaffAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireStaff("staff.manage");
  const r = await inviteStaff(
    s.actor,
    { name: fd.get("name"), email: fd.get("email"), role: fd.get("role") },
    await clientIp(),
  );
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/personel");
  return { ok: "Davet e-postası gönderildi (72 saat geçerli)." };
}

export async function staffRoleAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireStaff("staff.manage");
  const r = await changeStaffRole(s.actor, str(fd, "userId"), fd.get("role"), await clientIp());
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/personel");
  return { ok: "Rol güncellendi; kişinin açık oturumları kapatıldı." };
}

export async function staffDisableAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireStaff("staff.manage");
  const disable = str(fd, "disable") === "1";
  const r = await setStaffDisabled(s.actor, str(fd, "userId"), disable, await clientIp());
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/personel");
  return { ok: disable ? "Hesap kapatıldı." : "Hesap yeniden açıldı." };
}

/* ---------- Bildirimler ---------- */

export async function staffReadNotificationsAction(fd: FormData) {
  const s = await requireStaff();
  await markRead(s.actor.userId, str(fd, "id") || undefined);
  revalidatePath("/admin", "layout");
}

/* ---------- Stok ---------- */

function refreshStock(tenantId: string) {
  refreshTenant(tenantId);
  revalidatePath("/admin/stok");
}

export async function adjustStockAction(_: FormState, fd: FormData): Promise<FormState> {
  const tenantId = str(fd, "tenantId");
  const s = await staffFor("stock.write", tenantId);
  const dir = str(fd, "dir") === "out" ? -1 : 1;
  const qty = Number(str(fd, "qty"));
  const r = await adjustStock(
    s.actor,
    tenantId,
    { sku: str(fd, "sku"), delta: Number.isFinite(qty) ? dir * qty : NaN, note: str(fd, "note") },
    await clientIp(),
  );
  if (!r.ok) return { error: r.error, fieldErrors: r.fieldErrors };
  refreshStock(tenantId);
  return { ok: "Stok güncellendi; hareket kaydedildi." };
}

export async function setLocationAction(_: FormState, fd: FormData): Promise<FormState> {
  const tenantId = str(fd, "tenantId");
  const s = await staffFor("stock.write", tenantId);
  const r = await setLocation(s.actor, tenantId, str(fd, "sku"), str(fd, "location"));
  if (!r.ok) return { error: r.error };
  refreshStock(tenantId);
  return { ok: "Konum kaydedildi." };
}

export async function staffProductImageAction(_: FormState, fd: FormData): Promise<FormState> {
  const tenantId = str(fd, "tenantId");
  const s = await staffFor("stock.write", tenantId);
  const f = fd.get("image");
  if (!(f instanceof File) || f.size === 0) return { error: "Görsel seçin" };
  const r = await setProductImage(
    s.actor,
    tenantId,
    str(fd, "sku"),
    Buffer.from(await f.arrayBuffer()),
    await clientIp(),
  );
  if (!r.ok) return { error: r.error };
  refreshStock(tenantId);
  return { ok: "Görsel kaydedildi." };
}

export async function taskAttachAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireStaff("task.write");
  const id = str(fd, "id");
  const task = await db().task.findUnique({ where: { id } });
  if (!task || !canAccessTenant(s.actor, task.tenantId)) return { error: "Görev bulunamadı" };
  const f = fd.get("file");
  if (!(f instanceof File) || f.size === 0) return { error: "Dosya seçin" };
  // Ekip görevi müşteriye görünmüyorsa ek de iç kalır
  const internal = bool(fd, "internal") || !task.customerVisible;
  const r = await uploadDocument({
    tenantId: task.tenantId,
    kind: task.category === "VERGI" ? "VERGI" : task.category === "SIRKET" ? "SIRKET" : "DIGER",
    filename: f.name,
    data: Buffer.from(await f.arrayBuffer()),
    actorUserId: s.userId,
    ip: await clientIp(),
    approved: true,
    taskId: task.id,
    internal,
  });
  if (!r.ok) return { error: r.reason };
  revalidatePath("/admin/gorevler");
  refreshTenant(task.tenantId);
  return {
    ok: internal ? "Ek kaydedildi (yalnız ekip)." : "Ek kaydedildi; müşteri görevde görür.",
  };
}
