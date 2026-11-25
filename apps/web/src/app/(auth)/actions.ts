"use server";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { brand } from "@avrupadasat/core/brand.config";
import {
  confirmTwoFactorSetup,
  login,
  logout,
  passTwoFactor,
  readSession,
  requestPasswordReset,
  setPasswordWithToken,
  startTwoFactorSetup,
} from "@/server/auth";
import {
  clearSessionCookie,
  clientIp,
  sessionToken,
  setSessionCookie,
  userAgent,
} from "@/server/session";
import { otpauthUri } from "@/server/totp";

export type FormState = { error?: string; ok?: string; qr?: string; secret?: string } | undefined;

/** Yalnız site içi yönlendirmeye izin ver (açık yönlendirme önlemi) */
function safeNext(raw: FormDataEntryValue | null): string {
  const v = typeof raw === "string" ? raw : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "";
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const r = await login(
    String(fd.get("email") ?? ""),
    String(fd.get("password") ?? ""),
    await clientIp(),
    await userAgent(),
  );
  if (!r.ok) {
    return {
      error: {
        invalid: "E-posta veya şifre hatalı.",
        locked: "Çok sayıda hatalı deneme. Hesap 15 dakika kilitlendi.",
        rate_limited: "Çok fazla deneme. Biraz sonra tekrar deneyin.",
        disabled: "Hesap devre dışı.",
      }[r.reason],
    };
  }
  await setSessionCookie(r.token);
  if (r.needsTwoFactor) redirect("/giris/2fa");
  if (r.needsTwoFactorSetup) redirect("/hesap/2fa");
  const s = await readSession(r.token);
  const next = safeNext(fd.get("next"));
  redirect(
    next ||
      (s?.actor && ["CLIENT_OWNER", "CLIENT_USER"].includes(s.actor.role) ? "/panel" : "/admin"),
  );
}

export async function twoFactorAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = await sessionToken();
  if (!token) redirect("/giris");
  const fresh = await passTwoFactor(token, String(fd.get("code") ?? ""), await clientIp());
  if (!fresh) return { error: "Kod hatalı veya süresi geçmiş." };
  await setSessionCookie(fresh);
  const s = await readSession(fresh);
  redirect(
    s?.actor && ["CLIENT_OWNER", "CLIENT_USER"].includes(s.actor.role) ? "/panel" : "/admin",
  );
}

export async function startTwoFactorAction(): Promise<FormState> {
  const s = await readSession(await sessionToken());
  if (!s) redirect("/giris");
  const secret = await startTwoFactorSetup(s.userId);
  const qr = await QRCode.toDataURL(otpauthUri(secret, s.email, brand.name), {
    margin: 1,
    width: 220,
  });
  return { qr, secret };
}

export async function confirmTwoFactorAction(prev: FormState, fd: FormData): Promise<FormState> {
  const s = await readSession(await sessionToken());
  if (!s) redirect("/giris");
  const ok = await confirmTwoFactorSetup(
    s.userId,
    s.sessionId,
    String(fd.get("code") ?? ""),
    await clientIp(),
  );
  if (!ok) return { ...prev, error: "Kod doğrulanamadı. Uygulamadaki güncel kodu yazın." };
  redirect(s.actor && ["CLIENT_OWNER", "CLIENT_USER"].includes(s.actor.role) ? "/panel" : "/admin");
}

export async function logoutAction() {
  const token = await sessionToken();
  if (token) await logout(token, await clientIp());
  await clearSessionCookie();
  redirect("/giris");
}

export async function forgotAction(_: FormState, fd: FormData): Promise<FormState> {
  await requestPasswordReset(String(fd.get("email") ?? ""), await clientIp());
  return { ok: "Bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi (1 saat geçerli)." };
}

export async function setPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const pw = String(fd.get("password") ?? "");
  if (pw !== String(fd.get("password2") ?? "")) return { error: "Şifreler aynı değil." };
  const r = await setPasswordWithToken(String(fd.get("token") ?? ""), pw, await clientIp());
  if (!r.ok) return { error: r.reason };
  redirect("/giris?sifre=ok");
}
