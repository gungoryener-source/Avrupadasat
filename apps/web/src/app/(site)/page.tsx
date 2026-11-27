import Link from "next/link";
import {
  brand,
  formatEur,
  formationThirdPartyEstimate,
  operations,
  packages,
} from "@avrupadasat/core";
import { AssessmentForm } from "@/components/site/AssessmentForm";
import { HeroVisual } from "@/components/site/HeroVisual";
import {
  IconArrowRight,
  IconBuilding,
  IconCheck,
  IconLanguage,
  IconLayers,
  IconPin,
  IconReceipt,
  IconReturn,
  IconScale,
  IconShield,
  IconStore,
  IconSupport,
  IconWarehouse,
} from "@/components/site/Icons";
import { faqLd, JsonLd } from "@/components/site/JsonLd";
import { PlanCards, ThirdPartyFees } from "@/components/site/PlanCards";
import { SitePage } from "@/components/site/SiteChrome";
import { StickyCta } from "@/components/site/StickyCta";
import { homeFaq, serviceTiles, steps, trustPoints } from "@/content/home";

export const metadata = {
  title: { absolute: `${brand.name} — Türkiye'den Avrupa'ya satış, Almanya üzerinden` },
  description:
    "Türk üretici ve ihracatçılar için Almanya'da şirket kuruluşu, vergi ve KDV kaydı, depo ve fulfillment, Amazon.de ve eBay.de satışı. Tek ekip, Türkçe, şeffaf fiyat.",
  alternates: { canonical: "/" },
};

const TRUST_ICON = {
  layers: IconLayers,
  pin: IconPin,
  scale: IconScale,
  support: IconSupport,
} as const;

const SERVICE_ICON = {
  building: IconBuilding,
  receipt: IconReceipt,
  shield: IconShield,
  warehouse: IconWarehouse,
  store: IconStore,
  language: IconLanguage,
  return: IconReturn,
} as const;

/** Bugün ayrı ayrı yürütülen işler (karşılaştırma görseli) */
const SCATTERED = [
  "Vergi danışmanı",
  "Alman noteri",
  "Nakliyeci",
  "Gümrük müşaviri",
  "Depo",
  "Pazaryeri ajansı",
];

/** Hero altındaki doğrulanabilir bilgiler — hepsi yayınlanmış fiyat listesinden */
const FACTS = [
  { v: formatEur(operations.setupFee), l: "Kurulum ücreti" },
  { v: formatEur(operations.storagePerPalletMonth), l: "Palet başına aylık depolama" },
  { v: `${operations.noticePeriodMonths} ay`, l: "Fesih bildirimi, uzun sözleşme yok" },
  { v: "48 saat", l: "Ücretsiz uygunluk raporu" },
];

export default function HomePage() {
  return (
    <SitePage>
      <JsonLd data={faqLd(homeFaq)} />

      {/* Hero */}
      <section className="hero2" aria-labelledby="hero-title">
        <div className="wrap hero2__grid">
          <div className="hero2__copy">
            <p className="eyebrow">Türk üretici ve ihracatçılar için</p>
            <h1 id="hero-title">
              Türkiye&apos;den Avrupa&apos;ya.{" "}
              <span className="hero2__em">İşinizi Almanya üzerinden büyütün.</span>
            </h1>
            <p className="hero2__lead">
              Şirket kuruluşundan vergi kaydına, depolamadan Amazon satışlarına kadar Avrupa
              operasyonunuzu tek noktadan yönetin.
            </p>
            <div className="hero2__ctas">
              <Link className="btn btn-lg" href="#rapor" data-hero-cta>
                Ücretsiz Uygunluk Raporu Al
                <IconArrowRight size={18} />
              </Link>
              <Link className="btn btn-lg btn-o" href="#hizmetler">
                Hizmetlerimizi Keşfedin
              </Link>
            </div>
            <p className="hero2__trust">
              <IconCheck size={16} strokeWidth={2} />
              Türkiye merkezli işletmeler için Avrupa operasyon desteği
            </p>
          </div>
          <div className="hero2__visual">
            <HeroVisual />
          </div>
        </div>
        <div className="wrap">
          <dl className="facts">
            {FACTS.map((f) => (
              <div key={f.l}>
                <dt>{f.l}</dt>
                <dd>{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Neden biz */}
      <section className="sec" aria-labelledby="neden-title">
        <div className="wrap why">
          <div className="why__copy">
            <div className="sec__head" data-reveal>
              <p className="eyebrow">Neden {brand.name}</p>
              <h2 id="neden-title">Altı ayrı muhatap yerine tek ekip</h2>
              <p className="sec__lead">
                Avrupa&apos;ya açılan bir üretici bugün vergi danışmanı, noter, nakliyeci, gümrükçü,
                depo ve ajansla ayrı ayrı çalışır. Biz bu işleri tek süreçte birleştiriyoruz.
              </p>
            </div>
            <ol className="why__list">
              {trustPoints.map((t) => {
                const Icon = TRUST_ICON[t.icon];
                return (
                  <li key={t.n}>
                    <span className="why__icon">
                      <Icon size={20} />
                    </span>
                    <div>
                      <h3>
                        <span className="why__n">{t.n}</span>
                        {t.title}
                      </h3>
                      <p>{t.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          <div className="merge" aria-hidden>
            <div className="merge__label">Bugün</div>
            <ul className="merge__nodes">
              {SCATTERED.map((n) => (
                <li key={n}>
                  {n}
                  <small>ayrı sözleşme, ayrı fatura</small>
                </li>
              ))}
            </ul>
            <svg className="merge__lines" viewBox="0 0 300 72" preserveAspectRatio="none">
              {[50, 150, 250].map((x) => (
                <path key={x} d={`M${x},0 C${x},40 150,32 150,72`} />
              ))}
            </svg>
            <div className="merge__hub">
              <div className="merge__label merge__label--on">{brand.name} ile</div>
              <b>Tek ekip, tek panel, tek fatura</b>
              <span>Türkçe tek muhatap · Almanya&apos;da iş ortağı ağı</span>
            </div>
          </div>
        </div>
      </section>

      {/* Hizmetler */}
      <section className="sec sec--tint" id="hizmetler" aria-labelledby="hizmet-title">
        <div className="wrap">
          <div className="sec__head sec__head--split" data-reveal>
            <div>
              <p className="eyebrow">Hizmetler</p>
              <h2 id="hizmet-title">
                Almanya&apos;da satış için gereken her şey, tek çatı altında
              </h2>
            </div>
            <p className="sec__lead">
              İhtiyacınız olan modülleri seçin; hepsi aynı panelde, aynı ekip tarafından yürütülür.
            </p>
          </div>
          <div className="bento">
            {serviceTiles.map((s) => {
              const Icon = SERVICE_ICON[s.icon];
              return (
                <Link key={s.title} href={s.href} className={`tile tile--${s.size}`}>
                  <span className="tile__icon">
                    <Icon size={22} />
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  {s.points && (
                    <ul className="tile__points">
                      {s.points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  )}
                  {s.flow && (
                    <ol className="tile__flow" aria-label="Kuruluş adımları">
                      {s.flow.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ol>
                  )}
                  {s.size === "lg" && (
                    <dl className="tile__figs">
                      <div>
                        <dt>Hizmet bedeli (UG)</dt>
                        <dd>{formatEur(packages.BASLANGIC.oneTime.UG)}&apos;dan</dd>
                      </div>
                      <div>
                        <dt>Noter, sicil, tercüme</dt>
                        <dd>
                          ≈ {formatEur(formationThirdPartyEstimate.UG.minCents)}–
                          {formatEur(formationThirdPartyEstimate.UG.maxCents)}
                        </dd>
                      </div>
                    </dl>
                  )}
                  {s.outputs && (
                    <ul className="tile__outputs" aria-label="Çıktılar">
                      {s.outputs.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                  )}
                  <span className="tile__more">
                    Daha fazla bilgi <IconArrowRight size={16} />
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="nudge">
            <p>
              <b>Ürününüz için hangi kayıtlar gerekiyor?</b> 6 soruluk ön kontrolle hemen görün ya
              da ürününüze özel ücretsiz raporu isteyin.
            </p>
            <div className="nudge__ctas">
              <Link href="/urunum-avrupaya-uygun-mu" className="btn btn-o">
                Ön kontrol
              </Link>
              <Link href="#rapor" className="btn">
                Ücretsiz rapor al
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Nasıl çalışır */}
      <section className="sec" id="nasil-calisir" aria-labelledby="nasil-title">
        <div className="wrap">
          <div className="sec__head" data-reveal>
            <p className="eyebrow">Nasıl çalışır?</p>
            <h2 id="nasil-title">Başvurudan Avrupa&apos;da ilk satışa dört adım</h2>
          </div>
          <ol className="timeline2">
            {steps.map((s) => (
              <li key={s.n}>
                <span className="timeline2__n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Fiyatlandırma */}
      <section className="sec sec--tint" id="fiyatlandirma" aria-labelledby="fiyat-title">
        <div className="wrap">
          <div className="sec__head sec__head--center" data-reveal>
            <p className="eyebrow">Fiyatlandırma</p>
            <h2 id="fiyat-title">Açık fiyat, sürpriz yok</h2>
            <p className="sec__lead">
              Paket ücretleri ve kullanım bazlı kalemler tek fiyat listesinden gelir; site,
              hesaplayıcı ve teklifiniz aynı rakamları gösterir.
            </p>
          </div>
          <PlanCards />
          <ThirdPartyFees />
          <p className="sec__aside sec__aside--center">
            <Link href="/fiyatlar">Tüm fiyat listesi ve maliyet hesaplayıcı</Link>
          </p>
        </div>
      </section>

      {/* Uygunluk raporu formu */}
      <section className="sec assess-sec" id="rapor" aria-labelledby="rapor-title">
        <div className="wrap assess assess--home">
          <div className="assess__head">
            <p className="eyebrow">Ücretsiz uygunluk raporu</p>
            <h2 id="rapor-title">Ürününüz Avrupa&apos;ya hazır mı? Birlikte bakalım</h2>
            <p className="sec__lead">
              Beş kısa adım, yaklaşık iki dakika. Ürününüze özel raporu 48 saat içinde e-postanıza
              gönderiyoruz.
            </p>
          </div>
          <div className="assess__details">
            <div className="report-card">
              <div className="report-card__k">Raporunuzda</div>
              <ul>
                <li>Gerekli kayıtlar: KDV, ambalaj (LUCID), ürün güvenliği, WEEE</li>
                <li>Tahmini gümrük ve ithalat KDV&apos;si</li>
                <li>Size uygun şirket modeli ve satış kanalı</li>
                <li>Depo, paketleme ve paket dahil aylık maliyet tahmini</li>
              </ul>
            </div>
            <ol className="after">
              <li>
                <b>Form</b> Bugün, iki dakika
              </li>
              <li>
                <b>Rapor</b> 48 saat içinde e-postanızda
              </li>
              <li>
                <b>Görüşme</b> İsterseniz size özel teklif
              </li>
            </ol>
            <p className="assess__note">{brand.independenceNotice}</p>
          </div>
          <div className="assess__form">
            <AssessmentForm />
          </div>
        </div>
      </section>

      {/* SSS */}
      <section className="sec sec--tint" id="sss" aria-labelledby="sss-title">
        <div className="wrap faq2">
          <div className="faq2__head">
            <p className="eyebrow">Sık sorulan sorular</p>
            <h2 id="sss-title">Merak edilenler</h2>
            <p className="sec__lead">
              Kesin hukuki ve vergisel değerlendirme, durumunuza göre iş ortağımız avukat ve vergi
              danışmanı tarafından yapılır.
            </p>
            <Link href="/sss" className="af-link">
              Tüm sorular <IconArrowRight size={16} />
            </Link>
          </div>
          <div className="faq2__list">
            {homeFaq.map((f) => (
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
      </section>

      <StickyCta />
    </SitePage>
  );
}
