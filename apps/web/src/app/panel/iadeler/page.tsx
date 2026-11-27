import Link from "next/link";
import { forTenant, type Prisma } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import {
  Badge,
  EmptyState,
  PageHeader,
  Pager,
  Tabs,
  Toolbar,
  pageNum,
  sp,
} from "@/components/panel/ui";
import { IconReturn } from "@/components/site/Icons";
import { db } from "@/server/db";
import { RETURN_CONDITION } from "@/server/labels-ops";
import { requireClient } from "@/server/session";

export const metadata = { title: "İadeler" };

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireClient("order.read");
  const q = sp(await searchParams);
  const page = pageNum(q.sayfa);
  const size = 25;
  const where: Prisma.ReturnItemWhereInput = {
    ...(q.durum === "bekliyor"
      ? { condition: null }
      : q.durum && q.durum in RETURN_CONDITION
        ? { condition: q.durum as keyof typeof RETURN_CONDITION }
        : {}),
    ...(q.q
      ? {
          OR: [
            { sku: { contains: q.q, mode: "insensitive" } },
            { reason: { contains: q.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const t = forTenant(db(), s.actor.tenantId);
  const [items, total, sellable, damaged] = await Promise.all([
    t.returnItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: size,
      skip: (page - 1) * size,
      include: { order: { select: { externalId: true, channel: true } } },
    }),
    t.returnItem.count({ where }),
    t.returnItem.aggregate({ where: { condition: "SELLABLE" }, _sum: { quantity: true } }),
    t.returnItem.aggregate({ where: { condition: "DAMAGED" }, _sum: { quantity: true } }),
  ]);
  return (
    <>
      <PageHeader
        title="İadeler"
        desc="İadeler Almanya'daki depoda kontrol edilir; satılabilir olanlar stoğa döner."
      />
      <Tabs
        active="returns"
        items={[
          { key: "orders", label: "Siparişler", href: "/panel/siparisler" },
          { key: "returns", label: "İadeler", href: "/panel/iadeler" },
          { key: "messages", label: "Alıcı mesajları", href: "/panel/mesajlar" },
        ]}
      />
      <div className="stats" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
        <div className="st">
          <div className="st-l">Kayıtlı iade</div>
          <div className="st-v">{total}</div>
        </div>
        <div className="st">
          <div className="st-l">Stoğa dönen adet</div>
          <div className="st-v">{sellable._sum.quantity ?? 0}</div>
        </div>
        <div className="st">
          <div className="st-l">Hasarlı adet</div>
          <div className="st-v">{damaged._sum.quantity ?? 0}</div>
        </div>
      </div>
      <Toolbar
        q={q.q}
        placeholder="SKU veya neden"
        filters={[
          {
            name: "durum",
            label: "Durum",
            value: q.durum,
            options: [
              { value: "bekliyor", label: "Kontrol bekliyor" },
              ...Object.entries(RETURN_CONDITION).map(([value, label]) => ({ value, label })),
            ],
          },
        ]}
      />
      {items.length === 0 ? (
        <div className="pc">
          <EmptyState
            icon={<IconReturn size={20} />}
            title={q.q || q.durum ? "Sonuç yok" : "Henüz iade yok"}
            text="Pazaryerinden gelen iadeler depoya ulaştığında burada listelenir."
          />
        </div>
      ) : (
        <div className="tw">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Sipariş</th>
                <th>SKU</th>
                <th className="num">Adet</th>
                <th>Neden</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td data-l="Tarih">{fmtDate(r.createdAt)}</td>
                  <td data-l="Sipariş" className="mono">
                    {r.order?.externalId ?? "—"}
                  </td>
                  <td data-l="SKU" className="mono">
                    {r.sku}
                  </td>
                  <td data-l="Adet" className="num">
                    {r.quantity}
                  </td>
                  <td data-l="Neden">{r.reason ?? "—"}</td>
                  <td>
                    {r.condition ? (
                      <Badge
                        tone={
                          r.condition === "DAMAGED"
                            ? "red"
                            : r.condition === "REPACK"
                              ? "amber"
                              : "green"
                        }
                      >
                        {RETURN_CONDITION[r.condition]}
                      </Badge>
                    ) : (
                      <Badge tone="amber">Kontrol bekliyor</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pageSize={size} total={total} params={{ q: q.q, durum: q.durum }} />
      <p className="muted" style={{ fontSize: 13 }}>
        Bir iadeyle ilgili sorunuz mu var?{" "}
        <Link href="/panel/destek/yeni?kategori=SIPARIS">Destek talebi açın</Link>.
      </p>
    </>
  );
}
