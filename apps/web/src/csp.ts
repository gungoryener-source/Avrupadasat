/**
 * İçerik Güvenliği Politikası (CSP). Script'ler istek başına nonce ile; 'unsafe-inline' YOK.
 * Yalnız yapılandırılmış üçüncü taraflar açılır; GTM/Meta ayrıca çerez onayı olmadan yüklenmez.
 * (Not: GTM "özel HTML" etiketleri satır içi script ürettiği için bu politikada çalışmaz — bilinçli.)
 */
export function buildCsp(nonce: string, env: NodeJS.ProcessEnv = process.env): string {
  const isDev = env.NODE_ENV !== "production";
  const gtm = Boolean(env.GTM_ID);
  const meta = Boolean(env.META_PIXEL_ID);
  const turnstile = Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const src = (...parts: (string | false)[]) => parts.filter(Boolean).join(" ");
  return [
    "default-src 'self'",
    `script-src ${src(`'self' 'nonce-${nonce}'`, isDev && "'unsafe-eval'", gtm && "https://www.googletagmanager.com", meta && "https://connect.facebook.net", turnstile && "https://challenges.cloudflare.com")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${src("'self' data: blob:", gtm && "https://www.googletagmanager.com https://*.google-analytics.com https://www.google.com https://googleads.g.doubleclick.net", meta && "https://www.facebook.com")}`,
    "font-src 'self'",
    `connect-src ${src("'self'", isDev && "ws:", gtm && "https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.google.com", meta && "https://www.facebook.com https://connect.facebook.net")}`,
    `frame-src ${src(turnstile ? "https://challenges.cloudflare.com" : "'none'", gtm && "https://www.googletagmanager.com")}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
