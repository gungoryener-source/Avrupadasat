import Link from "next/link";
import { forTenant } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { db } from "@/server/db";
import { requireClient } from "@/server/session";
import { PageHeader, Tabs } from "@/components/panel/ui";
import { CatalogForm } from "../forms";
import { lowStockAction } from "../portal-actions";

export const metadata = { title: "Stok" };

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const s = await requireClient("stock.read");
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);
  const t = forTenant(db(), s.actor.tenantId);
  const items = await t.stockItem.findMany({
    where: q
      ? {
          OR: [
            { sku: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { sku: "asc" },
    take: 500,
  });
  return (
    <>
      <PageHeader
        title="Depo ve Stok"
        desc="Almanya deposundaki ürünleriniz, sevkiyatlar ve stok hareketleri."
      />
      <Tabs
        active="stok"
        items={[
          { key: "stok", label: "Stok", href: "/panel/stok" },
          { key: "sevkiyat", label: "Sevkiyatlar", href: "/panel/sevkiyatlar" },
        ]}
      />
      <form className="inline-form" style={{ marginBottom: 14 }}>
        <div className="field">
          <label htmlFor="q">Ara (SKU veya ad)</label>
          <input id="q" name="q" defaultValue={q} />
        </div>
        <button className="btn btn-o btn-sm">Ara</button>
        <a className="btn btn-o btn-sm" href="/panel/stok/csv" download>
          CSV indir
        </a>
        <a
          className="btn btn-o btn-sm"
          href={`/panel/stok/ktun?donem=${new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 1)).toISOString().slice(0, 7)}`}
          download
          title="Geçen ayın KTÜN (GTIN) bazlı sipariş karşılama raporu — e-ihracat destek başvurusu için"
        >
          KTÜN raporu (geçen ay)
        </a>
      </form>
      <table className="tbl" style={{ marginBottom: 22 }}>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Ürün</th>
            <th>EAN</th>
            <th>Depoda</th>
            <th>Rezerve</th>
            <th>Kullanılabilir</th>
            <th>Düşük stok eşiği</th>
            <th>Almanca içerik</th>
            <th>Güncelleme</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td className="mono">{i.sku}</td>
              <td>{i.name}</td>
              <td className="mono">{i.ean ?? "—"}</td>
              <td>{i.quantity}</td>
              <td>{i.reserved}</td>
              <td>
                <b style={i.quantity - i.reserved < 10 ? { color: "var(--p)" } : undefined}>
                  {i.quantity - i.reserved}
                </b>
              </td>
              <td>
                <form
                  action={lowStockAction}
                  style={{ display: "flex", gap: 6, alignItems: "center" }}
                >
                  <input type="hidden" name="sku" value={i.sku} />
                  <input
                    name="lowStockAt"
                    type="number"
                    min={0}
                    defaultValue={i.lowStockAt ?? ""}
                    aria-label={`${i.sku} düşük stok eşiği`}
                    style={{
                      width: 72,
                      height: 30,
                      border: "1px solid var(--line-2)",
                      borderRadius: 6,
                      padding: "0 6px",
                    }}
                  />
                  <button className="btn btn-o btn-sm" type="submit">
                    Kaydet
                  </button>
                  {i.lowStockAt !== null && i.quantity - i.reserved <= i.lowStockAt && (
                    <span className="tag red">Düşük</span>
                  )}
                </form>
              </td>
              <td>
                <Link href={`/panel/icerik/${encodeURIComponent(i.sku)}`}>
                  {i.contentApprovedAt ? (
                    <span className="tag ok">Onaylı</span>
                  ) : (
                    <span className="tag warn">Hazırla</span>
                  )}
                </Link>
              </td>
              <td>{fmtDate(i.updatedAt)}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={9} className="muted">
                Ürün yok. Aşağıdan katalog yükleyebilirsiniz.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <CatalogForm />
    </>
  );
}
