import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentView } from "@/components/site/ContentView";
import { SitePage } from "@/components/site/SiteChrome";
import { legal, legalBySlug } from "@/content/legal";
import { serviceBySlug, services } from "@/content/services";

export const dynamicParams = false;

export function generateStaticParams() {
  return [...services, ...legal].map((p) => ({ slug: p.slug }));
}

function find(slug: string) {
  return serviceBySlug.get(slug) ?? legalBySlug.get(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = find((await params).slug);
  if (!p) return {};
  return {
    title: { absolute: p.title },
    description: p.description,
    alternates: { canonical: `/${p.slug}` },
    openGraph: {
      title: p.title,
      description: p.description,
      type: p.schema === "Article" ? "article" : "website",
    },
    robots: legalBySlug.has(p.slug) ? { index: true, follow: true } : undefined,
  };
}

export default async function SlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = find(slug);
  if (!p) notFound();
  return (
    <SitePage>
      <ContentView page={p} path={`/${slug}`} />
    </SitePage>
  );
}
