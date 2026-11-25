import "server-only";

export const env = {
  appUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  isProd: process.env.NODE_ENV === "production",
  integrationsMode: (process.env.INTEGRATIONS_MODE ?? "mock") as "mock" | "live",
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY ?? "",
  turnstileSiteKey: process.env.TURNSTILE_SITE_KEY ?? "",
  gtmId: process.env.GTM_ID ?? "",
};

/** Oturum çerezi: üretimde __Host- öneki (yalnız HTTPS, path=/, domain yok) */
export const SESSION_COOKIE = env.isProd ? "__Host-as_session" : "as_session";
export const SESSION_DAYS = 14;
/** Hareketsizlik zaman aşımı */
export const SESSION_IDLE_MINUTES = 120;
