import { brand } from "@avrupadasat/core/brand.config";
import type { ContentPage, Faq } from "@/content/types";

export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** JSON-LD: </script> kaçışı ile güvenli gömme */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    url: SITE,
    email: brand.contact.email,
    description: brand.tagline,
    areaServed: ["TR", "DE"],
  };
}

export function faqLd(faq: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
}

export function pageLd(p: ContentPage, path: string) {
  if (p.schema === "Service") {
    return {
      "@context": "https://schema.org",
      "@type": "Service",
      name: p.h1,
      description: p.description,
      provider: { "@type": "Organization", name: brand.name, url: SITE },
      areaServed: { "@type": "Country", name: "Germany" },
      url: `${SITE}${path}`,
    };
  }
  if (p.schema === "Article") {
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: p.h1,
      description: p.description,
      dateModified: p.updated,
      inLanguage: "tr-TR",
      author: { "@type": "Organization", name: brand.name },
      publisher: { "@type": "Organization", name: brand.name },
      mainEntityOfPage: `${SITE}${path}`,
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: p.title,
    url: `${SITE}${path}`,
  };
}
