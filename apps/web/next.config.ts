import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Güvenlik başlıkları. CSP Aşama 2'de nonce tabanlı yapılacak (GTM/Meta onay sonrası yüklenecek).
 * Şimdilik üçüncü taraf kaynak yok: yalnız 'self'.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
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
