import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentView } from "@/components/site/ContentView";
import { SitePage } from "@/components/site/SiteChrome";
import { guideBySlug, guides } from "@/content/guides";

export const dynamicParams = false;

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const g = guideBySlug.get((await params).slug);
  if (!g) return {};
  return {
    title: { absolute: g.title },
    description: g.description,
    alternates: { canonical: `/rehber/${g.slug}` },
    openGraph: { title: g.title, description: g.description, type: "article" },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = guideBySlug.get(slug);
  if (!g) notFound();
  return (
    <SitePage>
      <ContentView
        page={g}
        path={`/rehber/${slug}`}
        parent={{ name: "Rehberler", path: "/rehber" }}
      />
    </SitePage>
  );
}
