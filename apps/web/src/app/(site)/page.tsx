import Link from "next/link";
import { brand, formatEur, operations, packages } from "@avrupadasat/core";
import { LeadForm } from "@/components/LeadForm";
import { Calculator } from "@/components/site/Calculator";
import { faqLd, JsonLd } from "@/components/site/JsonLd";
import { SitePage } from "@/components/site/SiteChrome";
import { generalFaq } from "@/content/faq";
import { services } from "@/content/services";

const ROUTE = [
  ["Şirket", "UG/GmbH, vergi ve gümrük numaraları"],
  ["Gümrük", "A.TR ile toplu ithalat, belge takibi"],
  ["Depo", "Mal kabul, paketleme, iade"],
  ["Pazaryeri", "Amazon.de, eBay.de, web mağaza"],
  ["Pazarlama", "Almanca içerik ve reklam"],
];

const ICON: Record<string, string> = {
  "almanyada-sirket-kurmak": "🏛️",
  "almanyada-depo-kiralama": "🏭",
  "gumruk-atr-ve-3-euro-vergisi": "🛃",
  "amazon-almanyada-satis": "🛒",
  "uyum-paketi": "✅",
  "iade-merkezi": "↩️",
  "e-ihracat-destek-rehberi": "📘",
};

export default function HomePage() {
  return (
    <SitePage>
      <JsonLd data={faqLd(generalFaq.slice(0, 6))} />
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="badge">İhracatçı firmalar için</span>
            <h1>{brand.heroTitle}</h1>
            <p>
              Almanya&apos;da şirketiniz, deponuz, gümrüğünüz ve satışınız: tek ekip, Türkçe, şeffaf
              fiyat.
            </p>
            <div className="row">
              <Link className="btn" href="/ucretsiz-uygunluk-raporu">
                Ücretsiz uygunluk raporu al
              </Link>
              <Link className="btn btn-o" href="/fiyatlar">
                Fiyatları gör
              </Link>
            </div>
            <ul className="trust">
              <li>Kurulum ücreti yok</li>
              <li>Aylık fesih</li>
              <li>48 saatte rapor</li>
              <li>Türkçe tek muhatap</li>
            </ul>
          </div>
          <div className="card route" aria-label="Almanya'ya giriş rotası">
            <div className="k">Almanya&apos;ya giriş rotası</div>
            <ol>
              {ROUTE.map(([t, d], i) => (
                <li key={t}>
                  <span className="num">{i + 1}</span>
                  <div>
                    <b>{t}</b>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {d}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="hizmetler">
        <div className="wrap">
          <div className="k">Hizmetler</div>
          <h2>Almanya&apos;da satış için gereken her şey</h2>
          <p className="muted" style={{ maxWidth: 680 }}>
            Vergi danışmanı, nakliyeci, gümrükçü, depo ve ajansla ayrı ayrı uğraşmak yerine tek
            ortak, tek panel, tek fatura.
          </p>
          <div className="grid3">
            {services.map((s) => (
              <Link key={s.slug} href={`/${s.slug}`} className="card svc">
                <span className="ico" aria-hidden>
                  {ICON[s.slug] ?? "•"}
                </span>
                <h3>{s.kicker}</h3>
                <p className="muted">{s.description.slice(0, 120)}…</p>
              </Link>
            ))}
            <Link href="/urunum-avrupaya-uygun-mu" className="card svc">
              <span className="ico" aria-hidden>
                🧭
              </span>
              <h3>Ürünüm Avrupa&apos;ya uygun mu?</h3>
              <p className="muted">
                6 soruda ürününüz için gereken kayıt ve belgelerin ön listesini görün.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <section id="nasil">
        <div className="wrap">
          <div className="k">Nasıl çalışır</div>
          <h2>3 adımda Avrupa&apos;da satış</h2>
          <ol className="grid3 how">
            {[
              [
                "Formu doldurun",
                "48 saat içinde ücretsiz Avrupa uygunluk raporunuz hazır: kayıtlar, gümrük, model ve maliyet.",
              ],
              ["Teklifi onaylayın", "Şirket, depo ve satış planı tek teklifte; çevrimiçi onay."],
              ["Satışa başlayın", "Malınız Almanya deposunda, siparişler ve kayıtlar panelinizde."],
            ].map(([t, d], i) => (
              <li key={t} className="card">
                <span className="badge">{i + 1}</span>
                <h3 style={{ marginTop: 10 }}>{t}</h3>
                <p className="muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="hesapla">
        <div className="wrap">
          <div className="k">Maliyet hesaplayıcı</div>
          <h2>Aylık maliyetinizi hemen görün</h2>
          <Calculator />
        </div>
      </section>

      <section id="paketler">
        <div className="wrap">
          <div className="k">Paketler</div>
          <h2>Şeffaf fiyat</h2>
          <div className="grid3">
            <div className="card plan">
              <h3>{packages.BASLANGIC.name}</h3>
              <p className="muted">Almanya&apos;da şirket kuruluşu</p>
              <div className="price">
                {formatEur(packages.BASLANGIC.oneTime.UG)}
                <small>&apos;dan · tek sefer</small>
              </div>
              <ul>
                <li>
                  UG ({formatEur(packages.BASLANGIC.oneTime.UG)}&apos;dan) veya GmbH (
                  {formatEur(packages.BASLANGIC.oneTime.GMBH)}&apos;dan)
                </li>
                <li>Vekâletname, apostil ve çeviri rehberliği</li>
                <li>Ticaret sicili ve vergi kaydı koordinasyonu</li>
                <li>Panelde adım adım takip</li>
              </ul>
              <Link className="btn btn-o" href="/ucretsiz-uygunluk-raporu">
                Teklif al
              </Link>
            </div>
            <div className="card plan">
              <h3>{packages.OPERASYON.name}</h3>
              <p className="muted">Şirketiniz Almanya&apos;da çalışsın</p>
              <div className="price">
                {formatEur(packages.OPERASYON.monthly)}
                <small>/ay + kuruluş</small>
              </div>
              <ul>
                <li>Başlangıç paketindeki her şey</li>
                <li>İş adresi (sanal ofis)</li>
                <li>Muhasebe ve vergi danışmanı koordinasyonu</li>
                <li>Stok ve sevkiyat yazılımı</li>
              </ul>
              <Link className="btn btn-o" href="/ucretsiz-uygunluk-raporu">
                Teklif al
              </Link>
            </div>
            <div className="card plan hot">
              <span className="badge">Önerilen</span>
              <h3>{packages.PAZARA_GIRIS.name}</h3>
              <p className="muted">Kuruluştan Avrupa&apos;da satışa</p>
              <div className="price">
                {formatEur(packages.PAZARA_GIRIS.monthly)}
                <small>&apos;dan/ay</small>
              </div>
              <ul>
                <li>Operasyon paketindeki her şey</li>
                <li>
                  <b>Kuruluş ücreti indirimli</b>
                </li>
                <li>Almanya&apos;da depo, fulfillment ve gümrük takibi</li>
                <li>Amazon.de ve eBay.de kurulumu ve yönetimi</li>
                <li>Almanca ürün sayfaları ve pazarlama</li>
              </ul>
              <Link className="btn" href="/ucretsiz-uygunluk-raporu">
                Ücretsiz raporla başla
              </Link>
            </div>
          </div>
          <p className="muted center" style={{ fontSize: 14, marginTop: 16 }}>
            Depolama {formatEur(operations.storagePerPalletMonth)}/palet/ay ·{" "}
            <Link href="/fiyatlar">Tüm fiyat listesi</Link> · Noter, sicil ve devlet harçları ile
            şirket sermayesi dahil değildir. Fiyatlar KDV hariç.
          </p>
        </div>
      </section>

      <section id="sss">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <div className="k">Sık sorulan sorular</div>
          <h2>Aklınızdaki sorular</h2>
          <div className="faq">
            {generalFaq.slice(0, 6).map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p>
            <Link href="/sss">Tüm sorular →</Link>
          </p>
        </div>
      </section>

      <section id="rapor">
        <div className="wrap">
          <div className="cta-band">
            <div>
              <h2>Ücretsiz uygunluk raporunuzu alın</h2>
              <p>
                Formu doldurun; 48 saat içinde ürününüze özel uygunluk raporu ve maliyet tahminiyle
                dönelim. Ücret ve taahhüt yok.
              </p>
              <p style={{ fontSize: 13, opacity: 0.85 }}>{brand.independenceNotice}</p>
            </div>
            <div className="card">
              <LeadForm />
            </div>
          </div>
        </div>
      </section>
    </SitePage>
  );
}
