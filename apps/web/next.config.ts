import type { NextConfig } from "next";

/**
 * Güvenlik başlıkları. CSP istek başına nonce ile src/proxy.ts'de üretilir (src/csp.ts);
 * proxy'nin kapsamadığı yollar (API, statik dosyalar) için burada katı bir varsayılan CSP var.
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  },
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
