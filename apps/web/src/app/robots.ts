import type { MetadataRoute } from "next";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  // Demo ortamı arama motorlarına kapalı
  if (process.env.DEMO_ENVIRONMENT === "1") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/panel", "/admin", "/api", "/teklif", "/sifre", "/giris", "/lp"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
