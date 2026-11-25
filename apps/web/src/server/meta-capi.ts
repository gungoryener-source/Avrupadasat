/**
 * Meta Conversions API (sunucu taraflı). YALNIZ reklam onayı verilmiş ziyaretçiler için çağrılır.
 * Tarayıcıdaki Pixel olayıyla aynı event_id kullanılır → Meta tekilleştirir.
 * Token yoksa (mock) hiçbir istek gönderilmez.
 */
import { createHash } from "node:crypto";

const norm = (s: string) => createHash("sha256").update(s.trim().toLowerCase()).digest("hex");
const normPhone = (s: string) => createHash("sha256").update(s.replace(/\D/g, "")).digest("hex");

export interface CapiLead {
  eventId: string;
  email: string;
  phone: string;
  sourceUrl: string;
  ip: string | null;
  userAgent?: string;
}

export function buildCapiPayload(e: CapiLead, now = Date.now()) {
  return {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(now / 1000),
        event_id: e.eventId,
        action_source: "website",
        event_source_url: e.sourceUrl,
        user_data: {
          em: [norm(e.email)],
          ph: [normPhone(e.phone)],
          ...(e.ip ? { client_ip_address: e.ip } : {}),
          ...(e.userAgent ? { client_user_agent: e.userAgent } : {}),
        },
      },
    ],
  };
}

export async function sendCapiLead(e: CapiLead): Promise<"sent" | "mock" | "error"> {
  const pixel = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixel || !token) return "mock";
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(pixel)}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCapiPayload(e)),
        signal: AbortSignal.timeout(4000),
      },
    );
    return res.ok ? "sent" : "error";
  } catch {
    return "error";
  }
}
