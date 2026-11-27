import { faqLd, JsonLd } from "@/components/site/JsonLd";
import { SitePage } from "@/components/site/SiteChrome";
import { generalFaq } from "@/content/faq";
import { homeFaq } from "@/content/home";

/** Ana sayfadaki sorular önce, genel liste sonra (aynı soru iki kez gösterilmez) */
const allFaq = [...homeFaq, ...generalFaq.filter((g) => !/Almanya'ya gitmem/.test(g.q))];

export const metadata = {
  title: "Sık Sorulan Sorular",
  description:
    "Almanya'da şirket kuruluşu, depo, gümrük, vergiler, devlet destekleri ve fiyatlar hakkında sık sorulan sorular.",
  alternates: { canonical: "/sss" },
};

export default function FaqPage() {
  return (
    <SitePage>
      <JsonLd data={faqLd(allFaq)} />
      <div className="wrap page-head">
        <p className="eyebrow">SSS</p>
        <h1>Sık sorulan sorular</h1>
        <p className="lead">
          Kesin hukuki ve vergisel değerlendirme, durumunuza göre iş ortağımız avukat ve vergi
          danışmanı tarafından yapılır.
        </p>
      </div>
      <div className="wrap faq2 faq2--page">
        <div className="faq2__list">
          {allFaq.map((f) => (
            <details key={f.q} className="acc">
              <summary>
                <span>{f.q}</span>
                <span className="acc__icon" aria-hidden />
              </summary>
              <div className="acc__body">
                <p>{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </SitePage>
  );
}
