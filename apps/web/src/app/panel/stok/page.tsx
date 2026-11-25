import { forTenant } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { db } from "@/server/db";
import { requireClient } from "@/server/session";
import { CatalogForm } from "../forms";

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
      <h1>Stok</h1>
      <form className="inline-form" style={{ marginBottom: 14 }}>
        <div className="field">
          <label htmlFor="q">Ara (SKU veya ad)</label>
          <input id="q" name="q" defaultValue={q} />
        </div>
        <button className="btn btn-o btn-sm">Ara</button>
        <a className="btn btn-o btn-sm" href="/panel/stok/csv" download>
          CSV indir
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
                {i.contentApprovedAt ? (
                  <span className="tag ok">Onaylı</span>
                ) : (
                  <span className="tag warn">Bekliyor</span>
                )}
              </td>
              <td>{fmtDate(i.updatedAt)}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={8} className="muted">
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
