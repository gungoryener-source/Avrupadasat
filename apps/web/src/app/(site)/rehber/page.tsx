import Link from "next/link";
import { SitePage } from "@/components/site/SiteChrome";
import { guides } from "@/content/guides";
import { services } from "@/content/services";

export const metadata = {
  title: "Avrupa'ya İhracat Rehberleri",
  description:
    "Almanya'da şirket kurma maliyeti, ihracat belgeleri, Amazon Almanya'da satış ve e-ihracat destekleri hakkında güncel Türkçe rehberler.",
  alternates: { canonical: "/rehber" },
};

export default function GuidesIndex() {
  const all = [
    ...guides.map((g) => ({ ...g, href: `/rehber/${g.slug}` })),
    ...services.filter((s) => s.schema === "Article").map((s) => ({ ...s, href: `/${s.slug}` })),
  ];
  return (
    <SitePage>
      <div className="wrap page-head">
        <div className="k">Rehberler</div>
        <h1>Avrupa&apos;ya ihracat rehberleri</h1>
        <p className="lead">
          Almanya&apos;da satışa hazırlanan üreticiler için sade, güncel ve Türkçe rehberler.
        </p>
      </div>
      <div className="wrap grid3" style={{ paddingBottom: 40 }}>
        {all.map((g) => (
          <Link key={g.slug} href={g.href} className="card svc">
            <h2 style={{ fontSize: 19, margin: "0 0 8px" }}>{g.h1}</h2>
            <p className="muted">{g.description}</p>
            <span className="muted" style={{ fontSize: 12 }}>
              Güncelleme: {new Date(g.updated).toLocaleDateString("tr-TR")}
            </span>
          </Link>
        ))}
      </div>
    </SitePage>
  );
}
