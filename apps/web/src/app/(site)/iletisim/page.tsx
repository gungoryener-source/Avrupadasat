import { brand } from "@avrupadasat/core/brand.config";
import { LeadForm } from "@/components/LeadForm";
import { SitePage } from "@/components/site/SiteChrome";

export const metadata = {
  title: "İletişim",
  description: `${brand.name} ile iletişime geçin: e-posta, WhatsApp ve ücretsiz uygunluk raporu formu.`,
  alternates: { canonical: "/iletisim" },
};

export default function ContactPage() {
  const wa = brand.contact.whatsapp;
  return (
    <SitePage>
      <div className="wrap page-head">
        <div className="k">İletişim</div>
        <h1>Bize ulaşın</h1>
        <p className="lead">Türkçe danışmanlarımız iş günlerinde aynı gün içinde dönüş yapar.</p>
      </div>
      <div className="wrap g2" style={{ paddingBottom: 40 }}>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>İletişim bilgileri</h2>
          <p>
            E-posta: <a href={`mailto:${brand.contact.email}`}>{brand.contact.email}</a>
          </p>
          {wa ? (
            <p>
              <a className="btn" href={`https://wa.me/${wa.replace(/\D/g, "")}`} rel="noopener">
                WhatsApp&apos;tan yazın
              </a>
            </p>
          ) : (
            <p className="muted">WhatsApp hattı yakında.</p>
          )}
          <p className="note">{brand.independenceNotice}</p>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Ücretsiz rapor / görüşme talebi</h2>
          <LeadForm id="iletisim-formu" />
        </div>
      </div>
    </SitePage>
  );
}
