import { forTenant } from "@avrupadasat/db";
import { z } from "zod";
import { audit } from "./audit";
import { issueToken } from "./auth";
import { db } from "./db";

export type MemberResult = { ok: true } | { ok: false; reason: string };

/** Firma sahibi ekibine kullanıcı davet eder (CLIENT_USER) */
export async function inviteMember(
  tenantId: string,
  input: { email: string; name: string },
  actorUserId: string,
): Promise<MemberResult> {
  const p = z
    .object({ email: z.email().max(254), name: z.string().trim().min(2).max(120) })
    .safeParse(input);
  if (!p.success) return { ok: false, reason: "Ad ve geçerli e-posta yazın" };
  const email = p.data.email.toLowerCase();
  const t = forTenant(db(), tenantId);
  if ((await t.membership.count()) >= 25) return { ok: false, reason: "En fazla 25 kullanıcı" };
  let user = await db().user.findUnique({ where: { email } });
  if (user?.staffRole) return { ok: false, reason: "Bu e-posta davet edilemez" };
  if (user && (await t.membership.findFirst({ where: { userId: user.id } })))
    return { ok: false, reason: "Bu kişi zaten ekibinizde" };
  user ??= await db().user.create({ data: { email, name: p.data.name } });
  await t.membership.create({ data: { userId: user.id, role: "CLIENT_USER" } as never });
  if (!user.passwordHash) await issueToken(user.id, "INVITE");
  await audit({ actorUserId, tenantId, action: "user.invited", entity: "User", entityId: user.id });
  return { ok: true };
}

export async function removeMember(
  tenantId: string,
  userId: string,
  actorUserId: string,
): Promise<MemberResult> {
  if (userId === actorUserId) return { ok: false, reason: "Kendinizi çıkaramazsınız" };
  const t = forTenant(db(), tenantId);
  const m = await t.membership.findFirst({ where: { userId } });
  if (!m) return { ok: false, reason: "Kullanıcı bulunamadı" };
  if (m.role === "CLIENT_OWNER") return { ok: false, reason: "Firma sahibi çıkarılamaz" };
  await t.membership.delete({ where: { id: m.id } });
  // Açık oturumları kapat: artık bu firmaya erişmemeli
  await db().session.deleteMany({ where: { userId } });
  await audit({
    actorUserId,
    tenantId,
    action: "role.changed",
    entity: "Membership",
    entityId: m.id,
    meta: { removed: true },
  });
  return { ok: true };
}
