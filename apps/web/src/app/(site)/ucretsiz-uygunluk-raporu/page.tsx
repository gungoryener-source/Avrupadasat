import { brand } from "@avrupadasat/core/brand.config";
import { AssessmentForm } from "@/components/site/AssessmentForm";
import { SitePage } from "@/components/site/SiteChrome";

export const metadata = {
  title: "Ücretsiz Avrupa Uygunluk Raporu — 48 Saatte",
  description:
    "Ürününüz Almanya'da satışa hazır mı? Kayıtlar, gümrük ve KDV tahmini, şirket modeli, satış kanalı ve aylık maliyet: 48 saatte ücretsiz rapor.",
  alternates: { canonical: "/ucretsiz-uygunluk-raporu" },
};

const ITEMS = [
  [
    "Uyum kontrol listesi",
    "CE, ürün güvenliği, ambalaj (LUCID) ve elektrikli ürünlerde WEEE yükümlülükleri",
  ],
  ["Tahmini gümrük ve ithalat KDV'si", "GTİP kodunuza göre, A.TR avantajıyla"],
  ["Size uygun şirket modeli", "Türk firmasıyla satış, UG veya GmbH karşılaştırması"],
  ["Satış kanalı önerisi", "Amazon.de, eBay.de veya kendi web mağazanız"],
  ["Aylık maliyet tahmini", "Depo, paketleme, kargo ve paket ücreti dahil"],
  ["Destek ön kontrolü", "Firmanızın başvurabileceği e-ihracat destekleri (garanti değildir)"],
];

export default function ReportPage() {
  return (
    <SitePage>
      <div className="wrap page-head">
        <p className="eyebrow">Ücretsiz</p>
        <h1>Avrupa uygunluk raporu</h1>
        <p className="lead">
          Beş kısa adımı doldurun; 48 saat içinde ürününüze özel raporla dönelim. Ücret ve taahhüt
          yok.
        </p>
      </div>
      <div className="wrap assess">
        <div className="assess__copy">
          <h2 style={{ fontSize: 22 }}>Raporda neler var?</h2>
          <ul className="checklist">
            {ITEMS.map(([t, d]) => (
              <li key={t}>
                <b>{t}</b>
                <div className="muted" style={{ fontSize: 14 }}>
                  {d}
                </div>
              </li>
            ))}
          </ul>
          <p className="assess__note">{brand.independenceNotice}</p>
        </div>
        <div className="assess__form">
          <AssessmentForm />
        </div>
      </div>
    </SitePage>
  );
}
