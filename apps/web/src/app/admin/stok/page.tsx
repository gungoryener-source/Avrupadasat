import Link from "next/link";
import type { Prisma } from "@avrupadasat/db";
import { Thumb } from "@/components/panel/StockViews";
import { Badge, EmptyState, PageHeader, Pager, Toolbar, pageNum, sp } from "@/components/panel/ui";
import { IconBox } from "@/components/site/Icons";
import { tenantOptions, tenantScope } from "@/server/admin-data";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Depo ve stok" };

export default async function AdminStock({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireStaff("stock.read");
  const q = sp(await searchParams);
  const tenants = await tenantOptions(s.actor);
  const firma = tenants.some((t) => t.value === q.firma) ? q.firma : undefined;
  const page = pageNum(q.sayfa);
  const size = 50;
  const where: Prisma.StockItemWhereInput = {
    ...tenantScope(s.actor, firma),
    ...(q.q
      ? {
          OR: [
            { sku: { contains: q.q, mode: "insensitive" } },
            { name: { contains: q.q, mode: "insensitive" } },
            { location: { contains: q.q, mode: "insensitive" } },
            { labelCode: { equals: q.q.trim().toUpperCase() } },
          ],
        }
      : {}),
    ...(q.raf === "yok" ? { location: null, quantity: { gt: 0 } } : {}),
  };
  // Düşük stok: kullanılabilir (miktar − ayrılmış) ≤ eşik — sütunlar arası karşılaştırma
  const lowIds =
    q.durum === "dusuk"
      ? (
          await db().$queryRaw<{ id: string }[]>`
            SELECT id FROM "StockItem"
            WHERE "lowStockAt" IS NOT NULL AND quantity - reserved <= "lowStockAt"`
        ).map((r) => r.id)
      : null;
  const finalWhere = lowIds ? { AND: [where, { id: { in: lowIds } }] } : where;
  const [items, total] = await Promise.all([
    db().stockItem.findMany({
      where: finalWhere,
      orderBy: [{ tenantId: "asc" }, { sku: "asc" }],
      take: size,
      skip: (page - 1) * size,
    }),
    db().stockItem.count({ where: finalWhere }),
  ]);
  const name = Object.fromEntries(tenants.map((t) => [t.value, t.label]));
  return (
    <>
      <PageHeader
        title="Depo ve stok"
        desc="Tüm firmaların ürünleri. Düzeltme, raf ve görsel işlemleri firma detayındaki Depo sekmesindedir."
        actions={
          <Link className="btn btn-p btn-sm" href="/admin/okut">
            Barkod okut
          </Link>
        }
      />
      <Toolbar
        q={q.q}
        placeholder="SKU, ad, raf veya etiket kodu"
        filters={[
          { name: "firma", label: "Firma", value: q.firma, options: tenants },
          {
            name: "durum",
            label: "Durum",
            value: q.durum,
            options: [{ value: "dusuk", label: "Düşük stok" }],
          },
          {
            name: "raf",
            label: "Raf",
            value: q.raf,
            options: [{ value: "yok", label: "Rafı atanmamış" }],
          },
        ]}
      />
      {total === 0 ? (
        <div className="pc">
          <EmptyState icon={<IconBox size={20} />} title="Ürün yok" text="Filtreleri değiştirin." />
        </div>
      ) : (
        <div className="tw">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Firma</th>
                <th>Raf</th>
                <th className="num">Depoda</th>
                <th className="num">Ayrılmış</th>
                <th className="num">Kullanılabilir</th>
                <th>
                  <span className="sr-only">Etiket</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const avail = i.quantity - i.reserved;
                const low = i.lowStockAt != null && avail <= i.lowStockAt;
                return (
                  <tr key={i.id}>
                    <td>
                      <div className="prod">
                        <Thumb id={i.id} has={!!i.imageKey} name={i.name} />
                        <div>
                          <span className="mono">{i.sku}</span>
                          <div style={{ fontSize: 13 }}>{i.name}</div>
                          <small className="mono muted">{i.labelCode}</small>
                        </div>
                      </div>
                    </td>
                    <td data-l="Firma">
                      <Link
                        href={`/admin/musteriler/${i.tenantId}?sekme=depo&q=${encodeURIComponent(i.sku)}`}
                      >
                        {name[i.tenantId] ?? "—"}
                      </Link>
                    </td>
                    <td data-l="Raf" className="mono">
                      {i.location ?? <span className="muted">—</span>}
                    </td>
                    <td data-l="Depoda" className="num">
                      {i.quantity}
                    </td>
                    <td data-l="Ayrılmış" className="num">
                      {i.reserved}
                    </td>
                    <td data-l="Kullanılabilir" className="num">
                      <b>{avail}</b> {low && <Badge tone="amber">Düşük</Badge>}
                    </td>
                    <td>
                      <a
                        href={`/api/etiket?u=${i.id}:1`}
                        target="_blank"
                        rel="noopener"
                        title={`${i.sku} için 1 termal etiket`}
                      >
                        Etiket
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager
        page={page}
        pageSize={size}
        total={total}
        params={{ q: q.q, firma: q.firma, durum: q.durum, raf: q.raf }}
      />
    </>
  );
}
