"use server";
import { submitLead } from "@/server/leads";
import { clientIp } from "@/server/session";
import { verifyTurnstile } from "@/server/turnstile";

export type LeadState =
  { ok: true } | { ok: false; error?: string; fieldErrors?: Record<string, string> } | undefined;

const ATTR_KEYS = [
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "gclid",
  "fbclid",
  "landingPath",
] as const;

export async function submitLeadAction(_: LeadState, fd: FormData): Promise<LeadState> {
  // Bal küpü alanı: botlar doldurur, insanlar görmez
  if (String(fd.get("website") ?? "") !== "") return { ok: true };
  const ip = await clientIp();
  if (!(await verifyTurnstile(fd.get("cf-turnstile-response")?.toString(), ip))) {
    return {
      ok: false,
      error: "Güvenlik doğrulaması başarısız. Sayfayı yenileyip tekrar deneyin.",
    };
  }
  const attribution: Record<string, string> = {};
  for (const k of ATTR_KEYS) {
    const v = fd.get(k);
    if (typeof v === "string" && v) attribution[k] = v.slice(0, 200);
  }
  const r = await submitLead(
    {
      companyName: fd.get("companyName"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      category: fd.get("category"),
      consentKvkk: fd.get("consentKvkk") === "on",
      marketingConsent: fd.get("marketingConsent") === "on",
      attribution,
    },
    ip,
  );
  if (r.ok) return { ok: true };
  if (r.reason === "rate_limited")
    return {
      ok: false,
      error: "Kısa sürede çok fazla gönderim yapıldı. Lütfen daha sonra tekrar deneyin.",
    };
  return { ok: false, fieldErrors: r.fieldErrors };
}
