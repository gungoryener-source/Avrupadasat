import { faqLd, JsonLd } from "@/components/site/JsonLd";
import { SitePage } from "@/components/site/SiteChrome";
import { generalFaq } from "@/content/faq";

export const metadata = {
  title: "Sık Sorulan Sorular",
  description:
    "Almanya'da şirket kuruluşu, depo, gümrük, vergiler, devlet destekleri ve fiyatlar hakkında sık sorulan sorular.",
  alternates: { canonical: "/sss" },
};

export default function FaqPage() {
  return (
    <SitePage>
      <JsonLd data={faqLd(generalFaq)} />
      <div className="wrap page-head" style={{ maxWidth: 820 }}>
        <div className="k">SSS</div>
        <h1>Sık sorulan sorular</h1>
      </div>
      <div className="wrap faq" style={{ maxWidth: 820, paddingBottom: 40 }}>
        {generalFaq.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </SitePage>
  );
}
