import { SitePage } from "@/components/site/SiteChrome";
import { Wizard } from "@/components/site/Wizard";

export const metadata = {
  title: "Ürünüm Avrupa'ya Uygun mu? Ücretsiz Ön Kontrol",
  description:
    "6 soruda ürününüz için Almanya'da gereken kayıt ve belgelerin ön listesi: CE, ürün güvenliği, ambalaj kaydı, WEEE, KDV, gıda etiketi.",
  alternates: { canonical: "/urunum-avrupaya-uygun-mu" },
};

export default function WizardPage() {
  return (
    <SitePage>
      <div className="wrap page-head">
        <div className="k">Ön kontrol</div>
        <h1>Ürünüm Avrupa&apos;ya uygun mu?</h1>
        <p className="lead">
          6 soruyu yanıtlayın; ürününüz için olası kayıt ve belgeleri listeleyelim.
        </p>
      </div>
      <div className="wrap" style={{ paddingBottom: 40 }}>
        <Wizard />
      </div>
    </SitePage>
  );
}
