import Link from "next/link";
import { brand } from "@avrupadasat/core";
import { AssessmentForm } from "@/components/site/AssessmentForm";
import { HeroVisual } from "@/components/site/HeroVisual";
import {
  IconArrowRight,
  IconBuilding,
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
              <Link className="btn btn-lg" href="/ucretsiz-uygunluk-raporu">
                Ücretsiz Uygunluk Raporu Al
                <IconArrowRight size={18} />
              </Link>
              <Link className="btn btn-lg btn-o" href="#hizmetler">
                Hizmetlerimizi Keşfedin
              </Link>
            </div>
            <p className="hero2__trust">
              Türkiye merkezli işletmeler için Avrupa operasyon desteği.
            </p>
            <ul className="hero2__facts" aria-label="Çalışma koşulları">
              <li>Kurulum ücreti yok</li>
              <li>Aylık fesih</li>
              <li>Türkçe tek muhatap</li>
            </ul>
          </div>
          <div className="hero2__visual">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Neden biz */}
      <section className="sec" aria-labelledby="neden-title">
        <div className="wrap">
          <div className="sec__head" data-reveal>
            <p className="eyebrow">Neden {brand.name}</p>
            <h2 id="neden-title">Avrupa&apos;ya açılmanın dağınık kısmını biz toparlıyoruz</h2>
            <p className="sec__lead">
              Vergi danışmanı, noter, nakliyeci, gümrükçü, depo ve ajansla ayrı ayrı uğraşmak yerine
              tek ekip ve tek süreç.
            </p>
          </div>
          <div className="trust4">
            {trustPoints.map((t, i) => {
              const Icon = TRUST_ICON[t.icon];
              return (
                <div
                  key={t.n}
                  className="trust4__item"
                  data-reveal
                  style={{ transitionDelay: `${i * 60}ms` }}
                >
                  <div className="trust4__top">
                    <span className="trust4__icon">
                      <Icon size={22} />
                    </span>
                    <span className="trust4__n">{t.n}</span>
                  </div>
                  <h3>{t.title}</h3>
                  <p>{t.text}</p>
                </div>
              );
            })}
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
            {serviceTiles.map((s, i) => {
              const Icon = SERVICE_ICON[s.icon];
              return (
                <Link
                  key={s.title}
                  href={s.href}
                  className={`tile tile--${s.size}`}
                  data-reveal
                  style={{ transitionDelay: `${(i % 3) * 60}ms` }}
                >
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
                  <span className="tile__more">
                    Daha fazla bilgi <IconArrowRight size={16} />
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="sec__aside" data-reveal>
            Ürününüz için hangi kayıtların gerektiğini merak ediyorsanız{" "}
            <Link href="/urunum-avrupaya-uygun-mu">6 soruluk ön kontrolü</Link> deneyin.
          </p>
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
            {steps.map((s, i) => (
              <li key={s.n} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
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
          <div data-reveal>
            <PlanCards />
          </div>
          <div data-reveal>
            <ThirdPartyFees />
          </div>
          <p className="sec__aside sec__aside--center">
            <Link href="/fiyatlar">Tüm fiyat listesi ve maliyet hesaplayıcı</Link>
          </p>
        </div>
      </section>

      {/* Uygunluk raporu formu */}
      <section className="sec" id="rapor" aria-labelledby="rapor-title">
        <div className="wrap assess">
          <div className="assess__copy" data-reveal>
            <p className="eyebrow">Ücretsiz uygunluk raporu</p>
            <h2 id="rapor-title">Ürününüz Avrupa&apos;ya hazır mı? Birlikte bakalım.</h2>
            <p className="sec__lead">
              Beş kısa adımı doldurun; 48 saat içinde ürününüze özel raporla dönelim. Ücret ve
              taahhüt yok.
            </p>
            <ul className="assess__list">
              <li>Gerekli kayıtlar: KDV, ambalaj (LUCID), ürün güvenliği, WEEE</li>
              <li>Tahmini gümrük ve ithalat KDV&apos;si</li>
              <li>Size uygun şirket modeli ve satış kanalı</li>
              <li>Aylık maliyet tahmini</li>
            </ul>
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
          <div className="faq2__head" data-reveal>
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
    </SitePage>
  );
}
