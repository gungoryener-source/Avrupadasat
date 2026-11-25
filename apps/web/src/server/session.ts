/** Next.js'e bağlı katman: çerez, IP ve sayfa korumaları */
import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { can, CLIENT_ROLES, STAFF_ROLES, type Permission } from "@avrupadasat/core/roles";
import { readSession, type SessionInfo } from "./auth";
import { env, SESSION_COOKIE, SESSION_DAYS } from "./env";

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export async function userAgent(): Promise<string | undefined> {
  return (await headers()).get("user-agent") ?? undefined;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function currentSession(): Promise<SessionInfo | null> {
  return readSession(await sessionToken());
}

async function requireFull(next: string): Promise<SessionInfo> {
  const s = await currentSession();
  if (!s) redirect(`/giris?next=${encodeURIComponent(next)}`);
  if (!s.twoFactorPassed) redirect("/giris/2fa");
  if (!s.actor) redirect("/giris?hata=yetki");
  return s;
}

/** Ekip paneli: ekip rolü + (gerekirse) izin + 2FA kurulu olmalı */
export async function requireStaff(permission?: Permission, next = "/admin") {
  const s = await requireFull(next);
  const actor = s.actor!;
  if (!STAFF_ROLES.includes(actor.role) && actor.role !== "PARTNER") redirect("/panel");
  if (!s.twoFactorEnabled) redirect("/hesap/2fa");
  if (permission && !can(actor.role, permission)) redirect("/admin?hata=yetki");
  return { ...s, actor };
}

/** Müşteri paneli: firma üyesi olmalı */
export async function requireClient(permission?: Permission, next = "/panel") {
  const s = await requireFull(next);
  const actor = s.actor!;
  if (!CLIENT_ROLES.includes(actor.role) || !actor.tenantId) redirect("/admin");
  if (actor.role === "CLIENT_OWNER" && !s.twoFactorEnabled) redirect("/hesap/2fa");
  if (permission && !can(actor.role, permission)) redirect("/panel?hata=yetki");
  return { ...s, actor: { ...actor, tenantId: actor.tenantId! } };
}
