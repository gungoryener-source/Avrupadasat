"use server";
import { after } from "next/server";
import { submitLead } from "@/server/leads";
import { sendCapiLead } from "@/server/meta-capi";
import { clientIp, userAgent } from "@/server/session";
import { verifyTurnstile } from "@/server/turnstile";

export type LeadState =
  | { ok: true; eventId?: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string> }
  | undefined;

const ATTR_KEYS = [
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "gclid",
  "fbclid",
  "landingPath",
] as const;

/** Çok adımlı formun ek yanıtları; tek adımlı form göndermez (undefined döner) */
function readProfile(fd: FormData) {
  if (fd.get("formVariant") !== "assessment") return undefined;
  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  return {
    contactName: str("contactName"),
    city: str("city"),
    website: str("companyWebsite"),
    channels: fd.getAll("channels").filter((v): v is string => typeof v === "string"),
    exportStatus: str("exportStatus"),
  };
}

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
      profile: readProfile(fd),
    },
    ip,
  );
  if (r.ok) {
    // Meta CAPI: yalnız tarayıcıda reklam onayı verilmişse; yanıt gönderildikten sonra çalışır
    const eventId = String(fd.get("eventId") ?? "");
    if (fd.get("adsConsent") === "1" && /^[0-9a-f-]{36}$/.test(eventId)) {
      const ua = await userAgent();
      const sourceUrl = String(fd.get("sourceUrl") ?? "").slice(0, 300);
      const email = String(fd.get("email"));
      const phone = String(fd.get("phone"));
      after(() =>
        sendCapiLead({ eventId, email, phone, sourceUrl, ip, userAgent: ua }).then(() => undefined),
      );
    }
    return { ok: true, eventId: eventId || undefined };
  }
  if (r.reason === "rate_limited")
    return {
      ok: false,
      error: "Kısa sürede çok fazla gönderim yapıldı. Lütfen daha sonra tekrar deneyin.",
    };
  return { ok: false, fieldErrors: r.fieldErrors };
}
