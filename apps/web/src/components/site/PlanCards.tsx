/**
 * Paket kartları — tutarlar YALNIZ @avrupadasat/core pricing'den gelir (tek kaynak).
 * Ana sayfa ve /fiyatlar aynı bileşeni kullanır.
 */
import Link from "next/link";
import {
  formatEur,
  formationThirdPartyEstimate,
  operations,
  packages,
  PAZARA_GIRIS_SETUP_DISCOUNT_PCT,
  pickPackRate,
} from "@avrupadasat/core";
import { IconCheck, IconPlus } from "./Icons";

type Plan = {
  code: string;
  name: string;
  who: string;
  price: string;
  unit: string;
  note: string;
  includes: string[];
  extra: string[];
  cta: string;
  featured?: boolean;
};

const ugSetupDiscounted = Math.round(
  (packages.BASLANGIC.oneTime.UG * (100 - PAZARA_GIRIS_SETUP_DISCOUNT_PCT)) / 100,
);

const PLANS: Plan[] = [
  {
    code: "BASLANGIC",
    name: packages.BASLANGIC.name,
    who: "Almanya'da şirketini kurmak isteyenler",
    price: formatEur(packages.BASLANGIC.oneTime.UG),
    unit: "'dan · tek sefer",
    note: `UG ${formatEur(packages.BASLANGIC.oneTime.UG)}, GmbH ${formatEur(packages.BASLANGIC.oneTime.GMBH)}'dan. Aylık ücret yok.`,
    includes: [
      "UG veya GmbH kuruluş koordinasyonu",
      "Vekâletname, apostil ve tercüme rehberliği",
      "Noter, ticaret sicili ve vergi kaydı takibi",
      "Her adım panelde, Türkçe tek muhatap",
    ],
    extra: [
      `Noter, sicil, apostil ve tercüme ≈ ${formatEur(formationThirdPartyEstimate.UG.minCents)}–${formatEur(formationThirdPartyEstimate.UG.maxCents)} (UG)`,
      "Şirket sermayesi (masraf değildir)",
    ],
    cta: "Teklif al",
  },
  {
    code: "OPERASYON",
    name: packages.OPERASYON.name,
    who: "Şirketi kurulu, Almanya'da düzenli çalışmak isteyenler",
    price: formatEur(packages.OPERASYON.monthly),
    unit: "/ay",
    note: "Şirket kuruluşu gerekiyorsa Başlangıç ücreti ayrıca eklenir.",
    includes: [
      "Başlangıç paketindeki her şey",
      "Almanya'da iş adresi (sanal ofis)",
      "Muhasebe ve vergi danışmanı koordinasyonu",
      "Stok ve sevkiyat takip yazılımı",
    ],
    extra: [
      `Aylık muhasebe ve KDV beyanı takibi ${formatEur(operations.extras.accountingMonthly)}/ay (isteğe bağlı)`,
      "Depo ve paketleme kullanım kadar",
    ],
    cta: "Teklif al",
  },
  {
    code: "PAZARA_GIRIS",
    name: packages.PAZARA_GIRIS.name,
    who: "Kuruluştan Avrupa'da satışa tek ekiple geçmek isteyenler",
    price: formatEur(packages.PAZARA_GIRIS.monthly),
    unit: "/ay",
    note: `${packages.PAZARA_GIRIS.largeFromPallets}+ palette ${formatEur(packages.PAZARA_GIRIS.monthlyLarge)}/ay. Kuruluş ücreti %${PAZARA_GIRIS_SETUP_DISCOUNT_PCT} indirimli (UG ${formatEur(ugSetupDiscounted)}).`,
    includes: [
      "Operasyon paketindeki her şey",
      "Depo, fulfillment ve gümrük takibi",
      "Amazon.de ve eBay.de kurulumu ve yönetimi",
      "Almanca ürün sayfaları ve pazarlama",
    ],
    extra: [
      `Depolama ${formatEur(operations.storagePerPalletMonth)}/palet/ay, paketleme ${formatEur(pickPackRate(0), { decimals: true })}/sipariş'ten`,
      `Pazaryeri yönetimi ürün başına ${formatEur(operations.extras.marketplacePerSku, { decimals: true })}/ay`,
      "Kargo, pazaryeri komisyonu ve reklam bütçesi",
    ],
    cta: "Ücretsiz raporla başla",
    featured: true,
  },
];

export function PlanCards() {
  return (
    <div className="plans">
      {PLANS.map((p) => (
        <article key={p.code} className={`plan${p.featured ? " plan--featured" : ""}`}>
          {p.featured && <span className="plan__flag">Satışa başlamak için önerilen</span>}
          <h3 className="plan__name">{p.name}</h3>
          <p className="plan__who">{p.who}</p>
          <div className="plan__price">
            <b>{p.price}</b>
            <span>{p.unit}</span>
          </div>
          <p className="plan__note">{p.note}</p>
          <Link
            href="/ucretsiz-uygunluk-raporu"
            className={`btn${p.featured ? "" : " btn-o"} plan__cta`}
          >
            {p.cta}
          </Link>
          <div className="plan__list">
            <div className="plan__lh">Dahil olanlar</div>
            <ul>
              {p.includes.map((i) => (
                <li key={i}>
                  <IconCheck size={16} strokeWidth={2} />
                  {i}
                </li>
              ))}
            </ul>
          </div>
          <div className="plan__list plan__list--extra">
            <div className="plan__lh">Ayrıca ödenen</div>
            <ul>
              {p.extra.map((i) => (
                <li key={i}>
                  <IconPlus size={14} strokeWidth={2} />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </div>
  );
}

/** Üçüncü taraf masraflarının açık listesi */
export function ThirdPartyFees() {
  return (
    <div className="fees">
      <div className="fees__head">
        <h3>Üçüncü taraf masrafları</h3>
        <p>
          Bu kalemler bize değil ilgili kuruma veya hizmet sağlayıcıya ödenir; faturasıyla birebir
          yansıtılır, üzerine pay eklenmez.
        </p>
      </div>
      <dl className="fees__grid">
        <div>
          <dt>Şirket kuruluşu</dt>
          <dd>Alman noteri, ticaret sicili, Türkiye&apos;de vekâletname ve yeminli tercüme</dd>
        </div>
        <div>
          <dt>Sevkiyat ve gümrük</dt>
          <dd>Türkiye&apos;den Almanya&apos;ya nakliye, gümrük vergisi ve ithalat KDV&apos;si</dd>
        </div>
        <div>
          <dt>Satış</dt>
          <dd>Almanya içi kargo, pazaryeri komisyonları ve reklam bütçesi</dd>
        </div>
        <div>
          <dt>Kayıt ve temsilcilik</dt>
          <dd>Ambalaj sistemi katılımı, gerekiyorsa yetkili temsilci ve WEEE kayıt ücretleri</dd>
        </div>
      </dl>
      <p className="fees__foot">
        Kurulum ücreti yok · {operations.noticePeriodMonths} ay önceden bildirimle fesih · Fiyatlar
        KDV hariç
      </p>
    </div>
  );
}
