/**
 * Mobil uygulama API kimlik doğrulaması: e-posta + şifre + (gerekirse) TOTP → 30 günlük Bearer token.
 * Yalnız müşteri rolleri (CLIENT_OWNER, CLIENT_USER). Token'ın yalnız SHA-256 hash'i saklanır.
 */
import { CLIENT_ROLES, type Actor, type Role } from "@avrupadasat/core/roles";
import { audit } from "./audit";
import { consumeTotp } from "./auth";
import { db } from "./db";
import { verifyPassword } from "./password";
import { hit } from "./rate-limit";
import { randomToken, sha256 } from "./tokens";

const TTL_DAYS = 30;

export type ApiLogin =
  { ok: true; token: string; expiresAt: string } | { ok: false; status: number; error: string };

export async function apiLogin(
  email: string,
  password: string,
  code: string | undefined,
  ip: string | null,
): Promise<ApiLogin> {
  if (!(await hit(`api-login:${ip ?? "?"}`, 10, 600)))
    return { ok: false, status: 429, error: "Çok fazla deneme" };
  const user = await db().user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { memberships: true },
  });
  if (user?.lockedUntil && user.lockedUntil > new Date())
    return { ok: false, status: 423, error: "Hesap geçici olarak kilitli" };
  const okPw = await verifyPassword(user?.passwordHash ?? null, password);
  if (!user || !okPw || user.disabledAt) {
    if (user) {
      const failed = user.failedLogins + 1;
      await db().user.update({
        where: { id: user.id },
        data: {
          failedLogins: failed >= 5 ? 0 : failed,
          lockedUntil: failed >= 5 ? new Date(Date.now() + 15 * 60_000) : null,
        },
      });
    }
    return { ok: false, status: 401, error: "E-posta veya şifre hatalı" };
  }
  if (user.staffRole || user.memberships.length === 0)
    return { ok: false, status: 403, error: "Mobil uygulama müşteri hesapları içindir" };
  if (user.twoFactorEnabledAt && user.twoFactorSecretEnc) {
    if (!code) return { ok: false, status: 401, error: "2FA kodu gerekli" };
    if (
      !(await hit(`api-2fa:${user.id}`, 6, 300)) ||
      !(await consumeTotp(user.id, user.twoFactorSecretEnc, code, user.lastTotpStep))
    ) {
      return { ok: false, status: 401, error: "2FA kodu hatalı" };
    }
  } else if (user.memberships.some((m) => m.role === "CLIENT_OWNER")) {
    return { ok: false, status: 403, error: "Önce web panelinden 2FA kurun" };
  }
  const token = `as_${randomToken()}`;
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);
  await db().apiToken.create({
    data: { userId: user.id, tokenHash: sha256(token), name: "mobil", expiresAt },
  });
  await db().user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lastLoginAt: new Date() },
  });
  await audit({
    actorUserId: user.id,
    action: "auth.login",
    entity: "ApiToken",
    meta: { via: "mobile" },
    ip,
  });
  return { ok: true, token, expiresAt: expiresAt.toISOString() };
}

export async function apiActor(
  req: Request,
): Promise<(Actor & { tenantId: string; name: string; apiTokenId: string }) | null> {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer (as_[A-Za-z0-9_-]{20,80})$/.exec(h);
  if (!m) return null;
  const t = await db().apiToken.findUnique({ where: { tokenHash: sha256(m[1]!) } });
  if (!t || t.expiresAt < new Date()) return null;
  const user = await db().user.findUnique({
    where: { id: t.userId },
    include: { memberships: { orderBy: { createdAt: "asc" } } },
  });
  const mem = user?.memberships[0];
  if (!user || user.disabledAt || !mem || !CLIENT_ROLES.includes(mem.role as Role)) return null;
  if (!t.lastUsedAt || Date.now() - t.lastUsedAt.getTime() > 60_000) {
    await db()
      .apiToken.update({ where: { id: t.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }
  return {
    userId: user.id,
    role: mem.role as Role,
    tenantId: mem.tenantId,
    name: user.name,
    apiTokenId: t.id,
  };
}

export async function apiLogout(req: Request) {
  const m = /^Bearer (as_[A-Za-z0-9_-]{20,80})$/.exec(req.headers.get("authorization") ?? "");
  if (m) await db().apiToken.deleteMany({ where: { tokenHash: sha256(m[1]!) } });
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

export const PUSH_TOKEN_RE = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,100}\]$/;

/** Cihazın bildirim anahtarını bu oturuma bağlar; aynı cihaz başka oturumdaysa oradan alınır */
export async function setPushToken(apiTokenId: string, pushToken: string | null) {
  if (pushToken === null) {
    await db().apiToken.update({ where: { id: apiTokenId }, data: { pushToken: null } });
    return;
  }
  await db().$transaction([
    db().apiToken.updateMany({
      where: { pushToken, NOT: { id: apiTokenId } },
      data: { pushToken: null },
    }),
    db().apiToken.update({ where: { id: apiTokenId }, data: { pushToken } }),
  ]);
}
