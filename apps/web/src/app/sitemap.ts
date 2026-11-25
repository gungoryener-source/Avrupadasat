import type { MetadataRoute } from "next";
import { guides } from "@/content/guides";
import { legal } from "@/content/legal";
import { services } from "@/content/services";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const u = (
    path: string,
    priority: number,
    lastModified?: string,
  ): MetadataRoute.Sitemap[number] => ({
    url: `${site}${path}`,
    priority,
    changeFrequency: "monthly",
    ...(lastModified ? { lastModified } : {}),
  });
  return [
    u("/", 1),
    u("/ucretsiz-uygunluk-raporu", 0.9),
    u("/fiyatlar", 0.9),
    u("/urunum-avrupaya-uygun-mu", 0.8),
    ...services.map((s) => u(`/${s.slug}`, 0.8, s.updated)),
    u("/rehber", 0.6),
    ...guides.map((g) => u(`/rehber/${g.slug}`, 0.6, g.updated)),
    u("/sss", 0.6),
    u("/iletisim", 0.5),
    ...legal.map((l) => u(`/${l.slug}`, 0.2, l.updated)),
  ];
}
