import Link from "next/link";
import { forTenant } from "@avrupadasat/db";
import { Thumb } from "@/components/panel/StockViews";
import { Card, EmptyState, PageHeader, sp } from "@/components/panel/ui";
import { IconBox } from "@/components/site/Icons";
import { db } from "@/server/db";
import { LABEL_FORMATS, MAX_LABELS } from "@/server/label-pdf";
import { requireClient } from "@/server/session";

export const metadata = { title: "Etiket bas" };

/**
 * Toplu etiket: her ürün için adet girilir, tek PDF iner. ?sevkiyat=<id> verilirse
 * o sevkiyatın bildirilen (ASN) miktarları önceden doldurulur.
 */
export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireClient("stock.read");
  const q = sp(await searchParams);
  const t = forTenant(db(), s.actor.tenantId);
  const [items, shipment] = await Promise.all([
    t.stockItem.findMany({
      orderBy: { sku: "asc" },
      take: 300,
      select: { id: true, sku: true, name: true, labelCode: true, imageKey: true },
    }),
    q.sevkiyat
      ? t.shipment.findFirst({
          where: { id: q.sevkiyat },
          select: { id: true, reference: true, lines: { select: { sku: true, quantity: true } } },
        })
      : null,
  ]);
  const prefill = new Map<string, number>();
  for (const l of shipment?.lines ?? []) prefill.set(l.sku, (prefill.get(l.sku) ?? 0) + l.quantity);
  return (
    <>
      <PageHeader
        title="Etiket bas"
        crumbs={[{ href: "/panel/stok", label: "Depo ve Stok" }]}
        desc={
          shipment ? (
            <>
              <b>{shipment.reference}</b> sevkiyatındaki miktarlar dolduruldu. Gerekirse değiştirin.
            </>
          ) : (
            "Depoya göndereceğiniz her ürün adedi için bir etiket basın ve ürünün üzerine yapıştırın."
          )
        }
      />
      {items.length === 0 ? (
        <div className="pc">
          <EmptyState
            icon={<IconBox size={20} />}
            title="Henüz ürün yok"
            text="Önce ürün kartlarınızı yükleyin; her ürüne otomatik etiket kodu verilir."
          />
        </div>
      ) : (
        <form action="/api/etiket" method="get" target="_blank" className="lbl-bulk">
          <Card
            title="Ürünler"
            action={
              <span className="muted" style={{ fontSize: 13 }}>
                Tek seferde en fazla {MAX_LABELS.toLocaleString("tr-TR")} etiket
              </span>
            }
            pad={false}
          >
            <div className="tw">
              <table className="tbl tbl-stack">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Etiket kodu</th>
                    <th className="num">Adet</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <div className="prod">
                          <Thumb id={i.id} has={!!i.imageKey} name={i.name} />
                          <div>
                            <Link href={`/panel/stok/urun/${i.id}`} className="mono">
                              {i.sku}
                            </Link>
                            <div style={{ fontSize: 13 }}>{i.name}</div>
                          </div>
                        </div>
                      </td>
                      <td data-l="Etiket kodu" className="mono">
                        {i.labelCode}
                      </td>
                      <td data-l="Adet" className="num">
                        <input
                          className="lbl-qty"
                          name={`n_${i.id}`}
                          type="number"
                          min={0}
                          max={500}
                          inputMode="numeric"
                          defaultValue={prefill.get(i.sku) ?? undefined}
                          placeholder="0"
                          aria-label={`${i.sku} etiket adedi`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="lbl-bar-actions">
            <div className="field">
              <label htmlFor="bicim">Etiket türü</label>
              <select id="bicim" name="bicim" defaultValue="termal">
                {Object.entries(LABEL_FORMATS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-p" type="submit">
              Etiket PDF&apos;i oluştur
            </button>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            Barkodu buruşmayan, düz bir yüzeye yapıştırın; ürünün üzerindeki başka barkodları (ör.
            üretici EAN&apos;ı) kapatmanız okutma hatalarını önler.
          </p>
        </form>
      )}
    </>
  );
}
