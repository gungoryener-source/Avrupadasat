import { brand } from "@avrupadasat/core/brand.config";
import {
  formatEur,
  operations,
  packages,
  PAZARA_GIRIS_SETUP_DISCOUNT_PCT,
  PRICE_LIST_VERSION,
} from "@avrupadasat/core/pricing";
import { Calculator } from "@/components/site/Calculator";
import { JsonLd, SITE } from "@/components/site/JsonLd";
import { SitePage } from "@/components/site/SiteChrome";

export const metadata = {
  title: "Fiyatlar: Almanya'da Depo, Şirket Kuruluşu ve Satış",
  description:
    "Yayınlanmış fiyat listesi: depolama €13/palet/ay, paketleme, iade, UG ve GmbH kuruluşu, aylık paketler. Kurulum ücreti yok, aylık fesih.",
  alternates: { canonical: "/fiyatlar" },
};

export default function PricesPage() {
  const rows: [string, string][] = [
    ["Depolama (Euro palet)", `${formatEur(operations.storagePerPalletMonth)} / palet / ay`],
    ["Mal kabul", `${formatEur(operations.inboundPerCarton, { decimals: true })} / koli`],
    ...operations.pickPackTiers
      .slice()
      .reverse()
      .map((t, i, arr): [string, string] => [
        `Pick & pack (${i === 0 ? `aylık ${arr[1]!.above} siparişe kadar` : i === arr.length - 1 ? `${t.above}+ sipariş` : `${t.above + 1}–${arr[i + 1]!.above} sipariş`})`,
        `${formatEur(t.perOrder, { decimals: true })} / sipariş`,
      ]),
    [
      "Amazon FBA'ya hazırlık",
      `${formatEur(operations.preFbaPerCarton, { decimals: true })} / koli`,
    ],
    ["İade işleme", `${formatEur(operations.returnPerItem)} / iade`],
    ["Kargo (Almanya içi)", "Taşıyıcı tarifesi, birebir"],
    ["Kurulum ücreti", "Yok"],
    ["Fesih", `${operations.noticePeriodMonths} ay önceden bildirim`],
  ];
  return (
    <SitePage>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "OfferCatalog",
          name: `${brand.name} fiyat listesi`,
          url: `${SITE}/fiyatlar`,
          itemListElement: [
            {
              "@type": "Offer",
              name: packages.BASLANGIC.name,
              price: packages.BASLANGIC.oneTime.UG / 100,
              priceCurrency: "EUR",
            },
            {
              "@type": "Offer",
              name: packages.OPERASYON.name,
              price: packages.OPERASYON.monthly / 100,
              priceCurrency: "EUR",
            },
            {
              "@type": "Offer",
              name: packages.PAZARA_GIRIS.name,
              price: packages.PAZARA_GIRIS.monthly / 100,
              priceCurrency: "EUR",
            },
          ],
        }}
      />
      <div className="wrap page-head">
        <div className="k">Fiyatlar</div>
        <h1>Tek ve tutarlı fiyat listesi</h1>
        <p className="lead">
          Site, hesaplayıcı ve teklifleriniz aynı listeden hesaplanır. Fiyatlar KDV hariçtir.
        </p>
      </div>
      <div className="wrap">
        <div className="g2">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Paketler</h2>
            <table className="tbl">
              <tbody>
                <tr>
                  <th scope="row">Başlangıç — UG kuruluşu</th>
                  <td>{formatEur(packages.BASLANGIC.oneTime.UG)}&apos;dan, tek sefer</td>
                </tr>
                <tr>
                  <th scope="row">Başlangıç — GmbH kuruluşu</th>
                  <td>{formatEur(packages.BASLANGIC.oneTime.GMBH)}&apos;dan, tek sefer</td>
                </tr>
                <tr>
                  <th scope="row">Operasyon</th>
                  <td>{formatEur(packages.OPERASYON.monthly)}/ay + kuruluş</td>
                </tr>
                <tr>
                  <th scope="row">Pazara Giriş</th>
                  <td>
                    {formatEur(packages.PAZARA_GIRIS.monthly)}/ay (
                    {packages.PAZARA_GIRIS.largeFromPallets}+ palette{" "}
                    {formatEur(packages.PAZARA_GIRIS.monthlyLarge)}/ay), kuruluş %
                    {PAZARA_GIRIS_SETUP_DISCOUNT_PCT} indirimli
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="note">
              Noter, ticaret sicili, apostil ve tercüme masrafları ile şirket sermayesi dahil
              değildir; faturasıyla birebir yansıtılır.
            </p>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Operasyon fiyatları</h2>
            <table className="tbl">
              <tbody>
                {rows.map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="note">
              <b>Pilot sevkiyat:</b> Almanya&apos;yı ilk 1–2 paletle, uzun sözleşme olmadan test
              edebilirsiniz.
            </p>
          </div>
        </div>
        <section>
          <h2>Hesaplayıcı</h2>
          <Calculator />
          <p className="muted" style={{ fontSize: 12 }}>
            Fiyat listesi sürümü: {PRICE_LIST_VERSION}
          </p>
        </section>
      </div>
    </SitePage>
  );
}
