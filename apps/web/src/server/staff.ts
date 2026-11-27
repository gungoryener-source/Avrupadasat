/**
 * Personel ve yetkiler (staff.manage) + abonelik paketi değişikliği (subscription.manage).
 * Kurallar: kendi rolünü değiştiremezsin, son Süper yönetici düşürülemez/kapatılamaz,
 * rol değişince açık oturumlar kapanır (yeni yetkiler hemen geçerli olsun).
 */
import { z } from "zod";
import { can, type Actor } from "@avrupadasat/core/roles";
import { packages, type PackageCode } from "@avrupadasat/core/pricing";
import type { StaffRole } from "@avrupadasat/db";
import { audit } from "./audit";
import { issueToken } from "./auth";
import { db } from "./db";
import { notifyTenant } from "./notifications";

export const STAFF_ROLE_OPTIONS: StaffRole[] = [
  "ADMIN",
  "OPS",
  "FINANCE",
  "SALES",
  "SUPPORT",
  "PARTNER",
];

type R = { ok: true } | { ok: false; error: string };

export async function listStaff() {
  return db().user.findMany({
    where: { staffRole: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      staffRole: true,
      disabledAt: true,
      lastLoginAt: true,
      twoFactorEnabledAt: true,
      passwordHash: true,
      createdAt: true,
    },
    orderBy: [{ disabledAt: { sort: "asc", nulls: "first" } }, { name: "asc" }],
  });
}

async function activeAdmins(exceptId?: string) {
  return db().user.count({
    where: { staffRole: "ADMIN", disabledAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
  });
}

const inviteInput = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter").max(120),
  email: z.email("Geçerli e-posta yazın").max(254),
  role: z.enum(STAFF_ROLE_OPTIONS as [StaffRole, ...StaffRole[]]),
});

export async function inviteStaff(actor: Actor, input: unknown, ip?: string | null): Promise<R> {
  if (!can(actor.role, "staff.manage")) return { ok: false, error: "Yetki yok" };
  const p = inviteInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Formu kontrol edin" };
  const email = p.data.email.toLowerCase();
  const existing = await db().user.findUnique({
    where: { email },
    include: { memberships: { select: { id: true } } },
  });
  if (existing?.memberships.length)
    return { ok: false, error: "Bu e-posta bir müşteri hesabına bağlı; ekip üyesi yapılamaz" };
  if (existing?.staffRole) return { ok: false, error: "Bu kişi zaten ekipte" };
  const user = existing
    ? await db().user.update({ where: { id: existing.id }, data: { staffRole: p.data.role } })
    : await db().user.create({ data: { email, name: p.data.name, staffRole: p.data.role } });
  if (!user.passwordHash) await issueToken(user.id, "INVITE");
  await audit({
    actorUserId: actor.userId,
    action: "staff.invited",
    entity: "User",
    entityId: user.id,
    meta: { role: p.data.role },
    ip,
  });
  return { ok: true };
}

export async function changeStaffRole(
  actor: Actor,
  userId: string,
  role: unknown,
  ip?: string | null,
): Promise<R> {
  if (!can(actor.role, "staff.manage")) return { ok: false, error: "Yetki yok" };
  const r = z.enum(STAFF_ROLE_OPTIONS as [StaffRole, ...StaffRole[]]).safeParse(role);
  if (!r.success) return { ok: false, error: "Geçersiz rol" };
  if (userId === actor.userId) return { ok: false, error: "Kendi rolünüzü değiştiremezsiniz" };
  const u = await db().user.findUnique({ where: { id: userId } });
  if (!u?.staffRole) return { ok: false, error: "Ekip üyesi bulunamadı" };
  if (u.staffRole === r.data) return { ok: true };
  if (u.staffRole === "ADMIN" && (await activeAdmins(u.id)) === 0)
    return { ok: false, error: "Son Süper yöneticinin rolü değiştirilemez" };
  await db().$transaction([
    db().user.update({ where: { id: userId }, data: { staffRole: r.data } }),
    db().session.deleteMany({ where: { userId } }),
  ]);
  await audit({
    actorUserId: actor.userId,
    action: "role.changed",
    entity: "User",
    entityId: userId,
    meta: { from: u.staffRole, to: r.data },
    ip,
  });
  return { ok: true };
}

export async function setStaffDisabled(
  actor: Actor,
  userId: string,
  disabled: boolean,
  ip?: string | null,
): Promise<R> {
  if (!can(actor.role, "staff.manage")) return { ok: false, error: "Yetki yok" };
  if (userId === actor.userId) return { ok: false, error: "Kendi hesabınızı kapatamazsınız" };
  const u = await db().user.findUnique({ where: { id: userId } });
  if (!u?.staffRole) return { ok: false, error: "Ekip üyesi bulunamadı" };
  if (disabled && u.staffRole === "ADMIN" && (await activeAdmins(u.id)) === 0)
    return { ok: false, error: "Son Süper yönetici kapatılamaz" };
  await db().$transaction([
    db().user.update({ where: { id: userId }, data: { disabledAt: disabled ? new Date() : null } }),
    ...(disabled ? [db().session.deleteMany({ where: { userId } })] : []),
  ]);
  await audit({
    actorUserId: actor.userId,
    action: "role.changed",
    entity: "User",
    entityId: userId,
    meta: { disabled },
    ip,
  });
  return { ok: true };
}

/**
 * Paket değişikliği: yalnız kayıt güncellenir; ödeme tahsil edilmez/simüle edilmez.
 * Fark faturası, bir sonraki dönem faturası hazırlanırken muhasebe tarafından düzenlenir.
 */
export async function changePackage(
  actor: Actor,
  tenantId: string,
  code: unknown,
  note: string,
  ip?: string | null,
): Promise<R> {
  if (!can(actor.role, "subscription.manage")) return { ok: false, error: "Yetki yok" };
  const c = z
    .enum(Object.keys(packages) as [PackageCode, ...PackageCode[]])
    .nullable()
    .safeParse(code === "" ? null : code);
  if (!c.success) return { ok: false, error: "Geçersiz paket" };
  const t = await db().tenant.findUnique({ where: { id: tenantId } });
  if (!t) return { ok: false, error: "Firma bulunamadı" };
  if (t.packageCode === c.data) return { ok: true };
  await db().tenant.update({ where: { id: tenantId }, data: { packageCode: c.data } });
  await audit({
    actorUserId: actor.userId,
    tenantId,
    action: "subscription.changed",
    entity: "Tenant",
    entityId: tenantId,
    meta: { from: t.packageCode, to: c.data, note: note.slice(0, 300) || undefined },
    ip,
  });
  await notifyTenant(tenantId, {
    type: "subscription",
    title: c.data ? `Paketiniz güncellendi: ${packages[c.data].name}` : "Paket kaydınız kaldırıldı",
    body: "Faturalandırmaya etkisini muhasebe ekibimiz sizinle paylaşır.",
    href: "/panel/abonelik",
    email: true,
  });
  return { ok: true };
}
