/**
 * Expo anlık bildirim gönderimi (APNs/FCM'e Expo Push Service üzerinden).
 * - İçerik kişisel veri taşımaz: yalnız başlık + uygulamadaki ekran yolu.
 * - EXPO_ACCESS_TOKEN tanımlıysa "enhanced push security" için gönderilir.
 * - DeviceNotRegistered dönen anahtarlar çağırana bildirilir (veritabanından silinsin).
 * - PUSH_MODE=mock (veya üretim dışında anahtar yoksa) yalnız loglar.
 */
export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  title: string;
  body: string;
  /** Uygulama içi yönlendirme, ör. "shipments" */
  screen?: string;
}

export type PushSender = (tokens: string[], msg: PushMessage) => Promise<{ invalid: string[] }>;

export function createPusher(
  env: NodeJS.ProcessEnv = process.env,
  log: (s: string) => void = console.info,
  fetchImpl: typeof fetch = fetch,
): PushSender {
  const mock =
    env.PUSH_MODE === "mock" || (env.PUSH_MODE !== "live" && env.INTEGRATIONS_MODE !== "live");
  return async (tokens, msg) => {
    if (tokens.length === 0) return { invalid: [] };
    if (mock) {
      log(`[mock:push] ${msg.title} → ${tokens.length} cihaz`);
      return { invalid: [] };
    }
    const invalid: string[] = [];
    for (let i = 0; i < tokens.length; i += 100) {
      const batch = tokens.slice(i, i + 100);
      const res = await fetchImpl(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          ...(env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(
          batch.map((to) => ({
            to,
            title: msg.title,
            body: msg.body,
            sound: "default",
            data: msg.screen ? { screen: msg.screen } : {},
          })),
        ),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Expo push hatası (${res.status})`);
      const j = (await res.json()) as {
        data?: { status: "ok" | "error"; details?: { error?: string } }[];
      };
      (j.data ?? []).forEach((t, k) => {
        if (t.status === "error" && t.details?.error === "DeviceNotRegistered")
          invalid.push(batch[k]!);
      });
    }
    return { invalid };
  };
}
