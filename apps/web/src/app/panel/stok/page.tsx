import Link from "next/link";
import { can } from "@avrupadasat/core/roles";
import { MovementTable, Thumb } from "@/components/panel/StockViews";
import {
  Badge,
  EmptyState,
  PageHeader,
  Pager,
  Stat,
  Tabs,
  Toolbar,
  pageNum,
  sp,
} from "@/components/panel/ui";
import { IconBox } from "@/components/site/Icons";
import { nowMs } from "@/server/clock";
import { requireClient } from "@/server/session";
import { listMovements, listStock, MOVEMENT_LABEL } from "@/server/stock";
import { CatalogForm } from "../forms";

export const metadata = { title: "Depo ve Stok" };

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireClient("stock.read");
  const q = sp(await searchParams);
  const tenantId = s.actor.tenantId;
  const moves = q.sekme === "hareket";
  const d = new Date(nowMs());
  const lastMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 7);
  const stock = await listStock(tenantId, {
    q: moves ? undefined : q.q?.slice(0, 60),
    low: q.durum === "dusuk",
    page: moves ? 1 : pageNum(q.sayfa),
  });
  const mv = moves
    ? await listMovements(tenantId, { reason: q.tur, sku: q.sku, page: pageNum(q.sayfa) })
    : null;
  return (
    <>
      <PageHeader
        title="Depo ve Stok"
        desc="Almanya deposundaki ürünleriniz: depodaki, yoldaki ve siparişlere ayrılmış miktarlar."
        actions={
          <div className="row-actions">
            <a className="btn btn-o btn-sm" href="/panel/stok/csv" download>
              CSV indir
            </a>
            <a
              className="btn btn-o btn-sm"
              href={`/panel/stok/ktun?donem=${lastMonth}`}
              download
              title="Geçen ayın KTÜN (GTIN) bazlı sipariş karşılama raporu — e-ihracat destek başvurusu için"
            >
              KTÜN raporu
            </a>
          </div>
        }
      />
      <Tabs
        active={moves ? "hareket" : "stok"}
        items={[
          { key: "stok", label: "Ürünler", href: "/panel/stok" },
          { key: "hareket", label: "Stok hareketleri", href: "/panel/stok?sekme=hareket" },
          { key: "sevkiyat", label: "Sevkiyatlar", href: "/panel/sevkiyatlar" },
        ]}
      />
      <div className="stats" style={{ gridTemplateColumns: "repeat(5, minmax(0,1fr))" }}>
        <Stat label="Ürün (SKU)" value={stock.totals.skus} />
        <Stat label="Depoda" value={stock.totals.units} hint="adet" />
        <Stat label="Yolda (gelen)" value={stock.totals.incoming} hint="henüz kabul edilmedi" />
        <Stat label="Ayrılmış (giden)" value={stock.totals.reserved} hint="siparişlere" />
        <Stat label="Düşük stok" value={stock.totals.low} />
      </div>

      {mv ? (
        <>
          <Toolbar
            search={false}
            keep={{ sekme: "hareket", sku: q.sku }}
            filters={[
              {
                name: "tur",
                label: "Hareket",
                value: q.tur,
                options: Object.entries(MOVEMENT_LABEL).map(([value, label]) => ({
                  value,
                  label,
                })),
              },
            ]}
          />
          {q.sku && (
            <p style={{ fontSize: 14 }}>
              <b className="mono">{q.sku}</b> için hareketler ·{" "}
              <Link href="/panel/stok?sekme=hareket">Tüm ürünler</Link>
            </p>
          )}
          <MovementTable data={mv} params={{ sekme: "hareket", tur: q.tur, sku: q.sku }} />
        </>
      ) : (
        <>
          <Toolbar
            q={q.q}
            placeholder="SKU, ürün adı veya raf"
            filters={[
              {
                name: "durum",
                label: "Durum",
                value: q.durum,
                options: [{ value: "dusuk", label: "Düşük stoktakiler" }],
              },
            ]}
          />
          {stock.total === 0 ? (
            <div className="pc">
              <EmptyState
                icon={<IconBox size={20} />}
                title={q.q || q.durum ? "Sonuç yok" : "Henüz ürün yok"}
                text={
                  q.q || q.durum
                    ? "Aramayı değiştirin."
                    : "Aşağıdan ürün kartlarınızı yükleyin; ilk sevkiyat kabul edildiğinde stok oluşur."
                }
              />
            </div>
          ) : (
            <div className="tw">
              <table className="tbl tbl-stack">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Raf</th>
                    <th className="num">Depoda</th>
                    <th className="num">Yolda</th>
                    <th className="num">Ayrılmış</th>
                    <th className="num">Kullanılabilir</th>
                    <th>Almanca içerik</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.items.map((i) => (
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
                      <td data-l="Raf" className="mono">
                        {i.location ?? "—"}
                      </td>
                      <td data-l="Depoda" className="num">
                        {i.quantity}
                      </td>
                      <td data-l="Yolda" className="num">
                        {i.incoming || "—"}
                      </td>
                      <td data-l="Ayrılmış" className="num">
                        {i.reserved}
                      </td>
                      <td data-l="Kullanılabilir" className="num">
                        <b>{i.available}</b> {i.low && <Badge tone="amber">Düşük</Badge>}
                      </td>
                      <td data-l="Almanca içerik">
                        <Link href={`/panel/icerik/${encodeURIComponent(i.sku)}`}>
                          {i.contentApprovedAt ? (
                            <Badge tone="green">Onaylı</Badge>
                          ) : (
                            <Badge tone="amber">Hazırla</Badge>
                          )}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager
            page={stock.page}
            pageSize={stock.pageSize}
            total={stock.total}
            params={{ q: q.q, durum: q.durum }}
          />
          {can(s.actor.role, "catalog.write") && (
            <div style={{ marginTop: 20 }} id="katalog">
              <CatalogForm />
            </div>
          )}
        </>
      )}
    </>
  );
}
