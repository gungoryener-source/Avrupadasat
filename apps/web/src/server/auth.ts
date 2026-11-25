/**
 * Kimlik doğrulama çekirdeği. Next'e bağımlı değildir (çerez işlemleri session.ts'de) — test edilebilir.
 */
import { decryptField, encryptField } from "@avrupadasat/db/crypto";
import type { Actor, Role } from "@avrupadasat/core/roles";
import { requiresTwoFactor } from "@avrupadasat/core/roles";
import { audit } from "./audit";
import { db } from "./db";
import { emit } from "./outbox";
import { hashPassword, passwordProblem, verifyPassword } from "./password";
import { hit } from "./rate-limit";
import { randomToken, sha256 } from "./tokens";
import { generateSecret, verifyTotp } from "./totp";

export const MAX_FAILED = 5;
export const LOCK_MINUTES = 15;
const SESSION_MS = 14 * 24 * 3600_000;
const IDLE_MS = 120 * 60_000;

export type LoginResult =
  | { ok: true; token: string; needsTwoFactor: boolean; needsTwoFactorSetup: boolean }
  | { ok: false; reason: "invalid" | "locked" | "rate_limited" | "disabled" };

export async function login(
  email: string,
  password: string,
  ip: string | null,
  userAgent?: string,
): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase();
  if (!(await hit(`login:ip:${ip ?? "?"}`, 20, 600))) return { ok: false, reason: "rate_limited" };

  const user = await db().user.findUnique({ where: { email: normalized } });
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    await verifyPassword(null, password);
    return { ok: false, reason: "locked" };
  }
  const valid = await verifyPassword(user?.passwordHash ?? null, password);
  if (!user || !valid) {
    if (user) {
      const failed = user.failedLogins + 1;
      const lock = failed >= MAX_FAILED;
      await db().user.update({
        where: { id: user.id },
        data: {
          failedLogins: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
        },
      });
      await audit({
        actorUserId: user.id,
        action: lock ? "auth.locked" : "auth.login_failed",
        entity: "User",
        entityId: user.id,
        ip,
      });
    }
    return { ok: false, reason: "invalid" };
  }
  if (user.disabledAt) return { ok: false, reason: "disabled" };

  const role = await primaryRole(user.id, user.staffRole);
  const has2fa = Boolean(user.twoFactorEnabledAt && user.twoFactorSecretEnc);
  const token = randomToken();
  await db().$transaction([
    db().user.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    }),
    db().session.create({
      data: {
        tokenHash: sha256(token),
        userId: user.id,
        twoFactorPassed: !has2fa,
        ip,
        userAgent: userAgent?.slice(0, 300) ?? null,
        expiresAt: new Date(Date.now() + SESSION_MS),
      },
    }),
  ]);
  await audit({
    actorUserId: user.id,
    action: "auth.login",
    entity: "User",
    entityId: user.id,
    ip,
  });
  return {
    ok: true,
    token,
    needsTwoFactor: has2fa,
    needsTwoFactorSetup: !has2fa && role !== null && requiresTwoFactor(role),
  };
}

async function primaryRole(userId: string, staffRole: string | null): Promise<Role | null> {
  if (staffRole) return staffRole as Role;
  const m = await db().membership.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  return (m?.role as Role | undefined) ?? null;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  email: string;
  name: string;
  twoFactorPassed: boolean;
  twoFactorEnabled: boolean;
  actor: Actor | null;
}

/** Token'dan oturum; süresi dolmuş veya hareketsiz oturumlar silinir */
export async function readSession(token: string | undefined | null): Promise<SessionInfo | null> {
  if (!token || token.length > 100) return null;
  const s = await db().session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: { include: { memberships: { orderBy: { createdAt: "asc" } }, partnerOf: true } },
    },
  });
  if (!s) return null;
  const now = Date.now();
  if (s.expiresAt.getTime() < now || s.lastSeenAt.getTime() < now - IDLE_MS || s.user.disabledAt) {
    await db()
      .session.delete({ where: { id: s.id } })
      .catch(() => undefined);
    return null;
  }
  if (now - s.lastSeenAt.getTime() > 60_000) {
    await db()
      .session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }
  const u = s.user;
  let actor: Actor | null = null;
  if (u.staffRole) {
    actor = {
      userId: u.id,
      role: u.staffRole as Role,
      tenantId: null,
      partnerTenantIds: u.staffRole === "PARTNER" ? u.partnerOf.map((p) => p.tenantId) : undefined,
    };
  } else if (u.memberships[0]) {
    actor = {
      userId: u.id,
      role: u.memberships[0].role as Role,
      tenantId: u.memberships[0].tenantId,
    };
  }
  return {
    sessionId: s.id,
    userId: u.id,
    email: u.email,
    name: u.name,
    twoFactorPassed: s.twoFactorPassed,
    twoFactorEnabled: Boolean(u.twoFactorEnabledAt),
    actor,
  };
}

export async function logout(token: string, ip: string | null) {
  const s = await db().session.findUnique({ where: { tokenHash: sha256(token) } });
  if (!s) return;
  await db().session.delete({ where: { id: s.id } });
  await audit({
    actorUserId: s.userId,
    action: "auth.logout",
    entity: "Session",
    entityId: s.id,
    ip,
  });
}

/**
 * Oturumdaki 2FA adımını doğrular. Başarılıysa oturum YENİ token ile değiştirilir
 * (oturum sabitleme önlemi) ve yeni token döner; başarısızsa null.
 */
export async function passTwoFactor(
  token: string,
  code: string,
  ip: string | null,
): Promise<string | null> {
  const s = await db().session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!s?.user.twoFactorSecretEnc) return null;
  if (!(await hit(`2fa:${s.userId}`, 6, 300))) return null;
  const ok = verifyTotp(decryptField(s.user.twoFactorSecretEnc), code);
  if (!ok) {
    await audit({
      actorUserId: s.userId,
      action: "auth.login_failed",
      entity: "User",
      entityId: s.userId,
      meta: { step: "2fa" },
      ip,
    });
    return null;
  }
  const fresh = randomToken();
  await db().$transaction([
    db().session.delete({ where: { id: s.id } }),
    db().session.create({
      data: {
        tokenHash: sha256(fresh),
        userId: s.userId,
        twoFactorPassed: true,
        ip,
        userAgent: s.userAgent,
        expiresAt: s.expiresAt,
      },
    }),
  ]);
  return fresh;
}

export async function startTwoFactorSetup(userId: string): Promise<string> {
  const secret = generateSecret();
  await db().user.update({
    where: { id: userId },
    data: { twoFactorSecretEnc: encryptField(secret), twoFactorEnabledAt: null },
  });
  return secret;
}

export async function confirmTwoFactorSetup(
  userId: string,
  sessionId: string,
  code: string,
  ip: string | null,
): Promise<boolean> {
  const u = await db().user.findUniqueOrThrow({ where: { id: userId } });
  if (!u.twoFactorSecretEnc || !verifyTotp(decryptField(u.twoFactorSecretEnc), code)) return false;
  await db().$transaction([
    db().user.update({ where: { id: userId }, data: { twoFactorEnabledAt: new Date() } }),
    db().session.update({ where: { id: sessionId }, data: { twoFactorPassed: true } }),
    // Diğer oturumlar kapatılır
    db().session.deleteMany({ where: { userId, NOT: { id: sessionId } } }),
  ]);
  await audit({
    actorUserId: userId,
    action: "auth.2fa_enabled",
    entity: "User",
    entityId: userId,
    ip,
  });
  return true;
}

/** Davet veya şifre sıfırlama token'ı üretir, e-posta olayını yazar */
export async function issueToken(
  userId: string,
  purpose: "INVITE" | "PASSWORD_RESET",
  hours = purpose === "INVITE" ? 72 : 1,
) {
  const token = randomToken();
  await db().$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    await tx.authToken.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.authToken.create({
      data: {
        userId,
        purpose,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + hours * 3600_000),
      },
    });
    await emit(tx, "user.invited.v1", {
      userId,
      email: user.email,
      purpose,
      tokenEnc: encryptField(token),
    });
  });
  return token;
}

export async function requestPasswordReset(email: string, ip: string | null) {
  if (!(await hit(`reset:ip:${ip ?? "?"}`, 5, 3600))) return;
  const user = await db().user.findUnique({ where: { email: email.trim().toLowerCase() } });
  // Kullanıcı yoksa da aynı yanıt: e-posta varlığı sızmaz
  if (user && !user.disabledAt) await issueToken(user.id, "PASSWORD_RESET");
}

export type SetPasswordResult = { ok: true } | { ok: false; reason: string };

export async function setPasswordWithToken(
  token: string,
  password: string,
  ip: string | null,
): Promise<SetPasswordResult> {
  const problem = passwordProblem(password);
  if (problem) return { ok: false, reason: problem };
  const t = await db().authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!t || t.usedAt || t.expiresAt < new Date())
    return { ok: false, reason: "Bağlantının süresi dolmuş veya kullanılmış" };
  const passwordHash = await hashPassword(password);
  await db().$transaction([
    db().authToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    db().user.update({
      where: { id: t.userId },
      data: { passwordHash, failedLogins: 0, lockedUntil: null },
    }),
    db().session.deleteMany({ where: { userId: t.userId } }),
  ]);
  await audit({
    actorUserId: t.userId,
    action: "auth.password_set",
    entity: "User",
    entityId: t.userId,
    meta: { via: t.purpose },
    ip,
  });
  return { ok: true };
}

export async function tokenIsValid(token: string): Promise<boolean> {
  const t = await db().authToken.findUnique({ where: { tokenHash: sha256(token) } });
  return Boolean(t && !t.usedAt && t.expiresAt > new Date());
}
