import Link from "next/link";
import { forTenant } from "@avrupadasat/db";
import { formatEur, packages } from "@avrupadasat/core/pricing";
import { fmtDate } from "@/components/AppShell";
import { Badge, Card, EmptyState, Stat, WorkBadge } from "@/components/panel/ui";
import { IconBox, IconCart, IconChecklist, IconFolder } from "@/components/site/Icons";
import { TAX_KIND_LABEL } from "@/server/company";
import { db } from "@/server/db";
import { DOC_KIND_LABEL, DOC_REVIEW_LABEL } from "@/server/documents";
import { CHANNEL_LABEL, ORDER_STATUS_LABEL } from "@/server/labels-ops";
import { listNotifications } from "@/server/notifications";
import { overview, waitingList } from "@/server/panel";
import { requireClient } from "@/server/session";
import { CUSTOMER_TASK_SELECT } from "@/server/tasks";
import { TICKET_STATUS_LABEL } from "@/server/tickets";

const TENANT_STATUS: Record<string, [string, "blue" | "green" | "amber" | "neutral"]> = {
  ONBOARDING: ["Kurulum sürüyor", "blue"],
  ACTIVE: ["Aktif", "green"],
  PAUSED: ["Durduruldu", "amber"],
  CLOSED: ["Kapalı", "neutral"],
};

export default async function PanelHome() {
  const s = await requireClient();
  const tid = s.actor.tenantId;
  const t = forTenant(db(), tid);
  const now = new Date();
  const [tenant, o, waiting, tasks, notes, docs, orders, filings, tickets] = await Promise.all([
    db().tenant.findUniqueOrThrow({
      where: { id: tid },
      select: { name: true, status: true, packageCode: true },
    }),
    overview(tid),
    waitingList(tid),
    t.task.findMany({
      where: { customerVisible: true, status: { not: "COMPLETED" } },
      select: CUSTOMER_TASK_SELECT,
      orderBy: [{ customerAction: "desc" }, { dueAt: { sort: "asc", nulls: "last" } }],
      take: 5,
    }),
    listNotifications(s.actor.userId, { take: 5 }),
    t.document.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    t.order.findMany({ orderBy: { orderedAt: "desc" }, take: 5 }),
    t.taxFiling.findMany({
      where: { status: { not: "COMPLETED" } },
      orderBy: { dueAt: "asc" },
      take: 4,
    }),
    t.ticket.findMany({
      where: { status: { in: ["OPEN", "WAITING_TEAM", "WAITING_CUSTOMER"] } },
      orderBy: { lastActivity: "desc" },
      take: 3,
    }),
  ]);
  const deadlines = [
    ...tasks
      .filter((x) => x.dueAt)
      .map((x) => ({ key: x.id, title: x.title, at: x.dueAt!, href: "/panel/gorevler" })),
    ...filings.map((f) => ({
      key: f.id,
      title: `${TAX_KIND_LABEL[f.kind] ?? f.kind} · ${f.period}`,
      at: f.dueAt,
      href: "/panel/vergi",
    })),
  ]
    .sort((a, b) => +a.at - +b.at)
    .slice(0, 5);
  const doneSteps = waiting.filter((w) => w.done).length;
  const [stLabel, stTone] = TENANT_STATUS[tenant.status] ?? [tenant.status, "neutral"];
  const pkg = tenant.packageCode ? packages[tenant.packageCode as keyof typeof packages] : null;
  const isNew = o.skus === 0 && orders.length === 0;

  return (
    <>
      <div className="hello">
        <div>
          <h1>Hoş geldiniz, {s.name.split(" ")[0]}</h1>
          <p>{tenant.name}</p>
        </div>
        <div className="hello-meta">
          <div>
            <small>Abonelik</small>
            <b>{pkg ? pkg.name : "Paket seçilmedi"}</b>
          </div>
          <div>
            <small>Operasyon durumu</small>
            <b>
              <Badge tone={stTone}>{stLabel}</Badge>
            </b>
          </div>
          <div>
            <small>Hazırlık</small>
            <b>
              {doneSteps} / {waiting.length} adım
            </b>
          </div>
        </div>
      </div>

      {o.salesLocked && (
        <div className="note" style={{ marginBottom: 16, padding: "12px 16px" }}>
          <b>Satış ve ödeme adımları vergi kayıtları tamamlanınca açılacak.</b> Bu arada aşağıdaki
          hazırlıkları yapabilirsiniz. <Link href="/panel/sirket">Kayıt durumunu gör →</Link>
        </div>
      )}

      {!isNew && (
        <div className="stats">
          <Stat
            label={`Son ${o.sales.days} gün ciro`}
            value={formatEur(o.sales.revenueCents)}
            hint={
              o.sales.changePct === null
                ? `${o.sales.orders} sipariş`
                : `${o.sales.orders} sipariş · önceki ${o.sales.days} güne göre %${o.sales.changePct}`
            }
          />
          <Stat
            label="Depodaki ürün"
            value={o.units.toLocaleString("tr-TR")}
            hint={`${o.skus} çeşit (SKU)`}
          />
          <Stat
            label="Yoldaki sevkiyat"
            value={o.activeShipments}
            hint={<Link href="/panel/sevkiyatlar">Sevkiyatlar</Link>}
          />
          <Stat label="Düşük stok" value={o.lowStock.length} hint="10 adedin altı" />
        </div>
      )}

      <div className="grid grid-main">
        <div className="stack">
          <Card title="Bekleyen görevler" action={<Link href="/panel/gorevler">Tümü</Link>}>
            {tasks.length === 0 ? (
              <EmptyState
                icon={<IconChecklist size={20} />}
                title="Bekleyen görev yok"
                text="Ekibimiz sizden bir işlem beklediğinde burada görürsünüz."
              />
            ) : (
              <ul className="ls">
                {tasks.map((x) => (
                  <li key={x.id}>
                    <div className="ls-main">
                      <Link href="/panel/gorevler">{x.title}</Link>
                      <small>
                        {x.customerAction ? "Sizden işlem bekleniyor" : "Ekipte"}
                        {x.dueAt ? ` · son tarih ${fmtDate(x.dueAt)}` : ""}
                      </small>
                    </div>
                    <WorkBadge status={x.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {isNew ? (
            <Card title="Başlangıç adımları">
              <div
                className="prog"
                style={{ marginBottom: 16 }}
                aria-label={`${doneSteps} / ${waiting.length} tamamlandı`}
              >
                <span style={{ transform: `scaleX(${doneSteps / waiting.length})` }} />
              </div>
              <ul className="ls">
                {waiting.map((w) => (
                  <li key={w.id}>
                    <div className="ls-main">
                      <Link href={w.href}>{w.title}</Link>
                    </div>
                    {w.done ? <Badge tone="green">Tamam</Badge> : <Badge>Bekliyor</Badge>}
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card
              title="Son siparişler"
              action={<Link href="/panel/siparisler">Tümü</Link>}
              pad={false}
            >
              {orders.length === 0 ? (
                <EmptyState
                  icon={<IconCart size={20} />}
                  title="Henüz sipariş yok"
                  text="Pazaryeri bağlandığında siparişler burada görünür."
                />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Sipariş</th>
                        <th>Kanal</th>
                        <th>Tarih</th>
                        <th className="num">Tutar</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((x) => (
                        <tr key={x.id}>
                          <td className="mono">{x.externalId}</td>
                          <td>{CHANNEL_LABEL[x.channel]}</td>
                          <td>{fmtDate(x.orderedAt)}</td>
                          <td className="num">{formatEur(x.itemsCents, { decimals: true })}</td>
                          <td>
                            <Badge
                              tone={
                                x.status === "SHIPPED" || x.status === "DELIVERED"
                                  ? "green"
                                  : x.status === "CANCELLED"
                                    ? "neutral"
                                    : x.status === "ON_HOLD"
                                      ? "amber"
                                      : "blue"
                              }
                            >
                              {ORDER_STATUS_LABEL[x.status]}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          <Card title="Önemli belgeler" action={<Link href="/panel/belgeler">Belgelerim</Link>}>
            {docs.length === 0 ? (
              <EmptyState
                icon={<IconFolder size={20} />}
                title="Henüz belge yok"
                text="Şirket, ürün ve sevkiyat belgelerinizi tek yerde saklayın."
                action={
                  <Link className="btn btn-sm" href="/panel/belgeler">
                    Belge yükle
                  </Link>
                }
              />
            ) : (
              <ul className="ls">
                {docs.map((d) => (
                  <li key={d.id}>
                    <div className="ls-main">
                      <b>{d.filename}</b>
                      <small>
                        {DOC_KIND_LABEL[d.kind]} · {fmtDate(d.createdAt)}
                        {d.expiresAt ? ` · geçerlilik ${fmtDate(d.expiresAt)}` : ""}
                      </small>
                    </div>
                    <Badge
                      tone={
                        d.review === "APPROVED"
                          ? "green"
                          : d.review === "REJECTED"
                            ? "red"
                            : "amber"
                      }
                    >
                      {DOC_REVIEW_LABEL[d.review]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="stack">
          <Card title="Bildirimler" action={<Link href="/panel/bildirimler">Tümü</Link>}>
            {notes.items.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Yeni bildirim yok.
              </p>
            ) : (
              <ul className="ls">
                {notes.items.map((n) => (
                  <li key={n.id}>
                    <span className="ls-dot" data-read={n.readAt ? "" : undefined} aria-hidden />
                    <div className="ls-main">
                      {n.href ? <Link href={n.href}>{n.title}</Link> : <b>{n.title}</b>}
                      <small>{fmtDate(n.createdAt, true)}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Yaklaşan son tarihler">
            {deadlines.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Yaklaşan son tarih yok.
              </p>
            ) : (
              <ul className="ls">
                {deadlines.map((d) => (
                  <li key={d.key}>
                    <div className="ls-main">
                      <Link href={d.href}>{d.title}</Link>
                      <small>{fmtDate(d.at)}</small>
                    </div>
                    {+d.at < +now ? (
                      <Badge tone="red">Gecikti</Badge>
                    ) : +d.at - +now < 5 * 86400_000 ? (
                      <Badge tone="amber">Yakında</Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Depo özeti" action={<Link href="/panel/stok">Stok</Link>}>
            {o.skus === 0 ? (
              <EmptyState
                icon={<IconBox size={20} />}
                title="Depoda ürün yok"
                text="Ürün kartlarınızı yükleyip ilk sevkiyatı bildirin."
              />
            ) : (
              <dl className="kv">
                <dt>Ürün çeşidi</dt>
                <dd>{o.skus}</dd>
                <dt>Toplam adet</dt>
                <dd>{o.units.toLocaleString("tr-TR")}</dd>
                <dt>Düşük stok</dt>
                <dd>{o.lowStock.length ? o.lowStock.map((x) => x.sku).join(", ") : "Yok"}</dd>
              </dl>
            )}
          </Card>

          <Card title="Destek talepleri" action={<Link href="/panel/destek">Destek Merkezi</Link>}>
            {tickets.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Açık talebiniz yok.
              </p>
            ) : (
              <ul className="ls">
                {tickets.map((x) => (
                  <li key={x.id}>
                    <div className="ls-main">
                      <Link href={`/panel/destek/${x.id}`}>
                        #{x.number} {x.subject}
                      </Link>
                      <small>{fmtDate(x.lastActivity, true)}</small>
                    </div>
                    <Badge tone={x.status === "WAITING_CUSTOMER" ? "amber" : "blue"}>
                      {TICKET_STATUS_LABEL[x.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
