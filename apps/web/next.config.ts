import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Güvenlik başlıkları. CSP Aşama 2'de nonce tabanlı yapılacak (GTM/Meta onay sonrası yüklenecek).
 * Şimdilik üçüncü taraf kaynak yok: yalnız 'self'.
 */
const gtm = Boolean(process.env.GTM_ID);
const meta = Boolean(process.env.META_PIXEL_ID);
const turnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
const src = (...parts: (string | false)[]) => parts.filter(Boolean).join(" ");

/**
 * CSP yalnız yapılandırılmış üçüncü tarafları açar. GTM/Meta etiketleri ayrıca
 * çerez onayı olmadan YÜKLENMEZ (components/consent.tsx).
 */
const csp = [
  "default-src 'self'",
  `script-src ${src("'self' 'unsafe-inline'", isDev && "'unsafe-eval'", gtm && "https://www.googletagmanager.com", meta && "https://connect.facebook.net", turnstile && "https://challenges.cloudflare.com")}`,
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

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Belge yükleme sınırı 10 MB (sunucuda ayrıca doğrulanır)
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  reactStrictMode: true,
  transpilePackages: ["@avrupadasat/core", "@avrupadasat/ui", "@avrupadasat/db"],
  serverExternalPackages: ["@node-rs/argon2", "pg", "@prisma/adapter-pg"],
  outputFileTracingIncludes: { "/**": ["./assets/fonts/**"] },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/(panel|admin)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      // Token içeren sayfalar: Referer ile token sızmasın, önbelleğe alınmasın
      {
        source: "/(teklif|sifre)/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
