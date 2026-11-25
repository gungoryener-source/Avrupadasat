import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brand } from "@avrupadasat/core/brand.config";
import { Logo } from "@avrupadasat/ui";
import { LeadForm } from "@/components/LeadForm";
import { landingBySlug, landings } from "@/content/landings";

export const dynamicParams = false;

export function generateStaticParams() {
  return landings.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const l = landingBySlug.get((await params).slug);
  if (!l) return {};
  // Reklam açılış sayfaları organik aramada hizmet sayfalarıyla yarışmasın
  return {
    title: { absolute: l.title },
    description: l.description,
    robots: { index: false, follow: true },
  };
}

export default async function LandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { slug } = await params;
  const l = landingBySlug.get(slug);
  if (!l) notFound();
  const v = (await searchParams).v === "b" ? "b" : "a";
  const c = l.variants[v];
  return (
    <>
      <header className="wrap nav">
        <Link href="/" style={{ textDecoration: "none" }}>
          <Logo />
        </Link>
      </header>
      <main className="wrap lp" data-variant={v}>
        <div>
          <span className="badge">İhracatçı firmalar için</span>
          <h1>{c.h1}</h1>
          <p className="lead">{c.sub}</p>
          <ul className="checklist">
            {l.bullets.map((b) => (
              <li key={b}>✓ {b}</li>
            ))}
          </ul>
          <p className="note">{brand.independenceNotice}</p>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 20 }}>{c.cta}</h2>
          <LeadForm id={`lp-${slug}`} />
        </div>
      </main>
    </>
  );
}
