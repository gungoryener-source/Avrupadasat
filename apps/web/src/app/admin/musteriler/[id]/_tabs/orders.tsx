import Link from "next/link";
import { forTenant, type OrderStatus, type Prisma } from "@avrupadasat/db";
import { formatEur } from "@avrupadasat/core/pricing";
import { fmtDate } from "@/components/AppShell";
import { Badge, Card, EmptyState, Pager, Toolbar, pageNum, type Tone } from "@/components/panel/ui";
import { db } from "@/server/db";
import { CHANNEL_LABEL, ORDER_STATUS } from "@/server/labels-ops";
import type { TabCtx } from "./ctx";

const TONE: Record<string, Tone> = { red: "red", warn: "amber", ok: "green", "": "neutral" };

export async function OrdersTab({ tenantId, q }: TabCtx) {
  const t = forTenant(db(), tenantId);
  const page = pageNum(q.sayfa);
  const size = 25;
  const where: Prisma.OrderWhereInput = {
    ...(q.durum && q.durum in ORDER_STATUS ? { status: q.durum as OrderStatus } : {}),
    ...(q.q ? { externalId: { contains: q.q, mode: "insensitive" } } : {}),
  };
  const [orders, total, conns] = await Promise.all([
    t.order.findMany({
      where,
      orderBy: { orderedAt: "desc" },
      take: size,
      skip: (page - 1) * size,
      include: { lines: true },
    }),
    t.order.count({ where }),
    t.marketplaceConnection.findMany({ orderBy: { channel: "asc" } }),
  ]);
  return (
    <>
      <Card title="Satış kanalları">
        {conns.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Bağlı kanal yok. Müşteri Pazaryerleri sayfasından bağlar.
          </p>
        ) : (
          <ul className="ls">
            {conns.map((c) => (
              <li key={c.id}>
                <div className="ls-main">
                  <b>{CHANNEL_LABEL[c.channel]}</b>
                  <small>
                    {c.externalAccount ?? "hesap bilgisi yok"} · son senkron{" "}
                    {c.lastSyncAt ? fmtDate(c.lastSyncAt, true) : "—"}
                    {c.lastError && ` · hata: ${c.lastError}`}
                  </small>
                </div>
                {c.mode === "mock" ? (
                  <Badge tone="amber">Demo modu</Badge>
                ) : c.status === "ACTIVE" ? (
                  <Badge tone={c.lastError ? "red" : "green"}>
                    {c.lastError ? "Hata" : "Canlı"}
                  </Badge>
                ) : (
                  <Badge>Kapalı</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div style={{ height: 16 }} />
      <Toolbar
        q={q.q}
        placeholder="Sipariş no"
        keep={{ sekme: "siparisler" }}
        filters={[
          {
            name: "durum",
            label: "Durum",
            value: q.durum,
            options: Object.entries(ORDER_STATUS).map(([value, [label]]) => ({ value, label })),
          },
        ]}
      />
      {total === 0 ? (
        <Card>
          <EmptyState title="Sipariş yok" text="Kanallardan sipariş geldiğinde burada görünür." />
        </Card>
      ) : (
        <div className="tw">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th>Sipariş</th>
                <th>Tarih</th>
                <th>Ürünler</th>
                <th className="num">Tutar</th>
                <th>Kargo</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    {CHANNEL_LABEL[o.channel]}
                    <div className="mono" style={{ fontSize: 12 }}>
                      {o.externalId}
                    </div>
                  </td>
                  <td data-l="Tarih">{fmtDate(o.orderedAt, true)}</td>
                  <td data-l="Ürünler" className="mono" style={{ fontSize: 12 }}>
                    {o.lines.map((l) => `${l.quantity}× ${l.sku}`).join(", ")}
                  </td>
                  <td data-l="Tutar" className="num">
                    {formatEur(o.itemsCents, { decimals: true })}
                  </td>
                  <td data-l="Kargo">{o.trackingNo ? `${o.carrier} ${o.trackingNo}` : "—"}</td>
                  <td data-l="Durum">
                    <Badge tone={TONE[ORDER_STATUS[o.status][1]]}>
                      {ORDER_STATUS[o.status][0]}
                    </Badge>
                    {o.holdReason && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {o.holdReason}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager
        page={page}
        pageSize={size}
        total={total}
        params={{ sekme: "siparisler", q: q.q, durum: q.durum }}
      />
      <p style={{ fontSize: 13 }}>
        <Link href={`/admin/siparisler?firma=${tenantId}`}>Kargolama kuyruğuna git →</Link>
      </p>
    </>
  );
}
