import Link from "next/link";
import { Suspense } from "react";
import { packages } from "@avrupadasat/core/pricing";
import { can } from "@avrupadasat/core/roles";
import { forTenant } from "@avrupadasat/db";
import { ActivityFeed } from "@/components/dash/ActivityFeed";
import { ChannelBadge, CHANNEL_NAME } from "@/components/dash/ChannelBadge";
import { CopyButton } from "@/components/dash/CopyButton";
import { fmtDay, fmtEur, fmtNum, fmtRelative, shortId } from "@/components/dash/format";
import { Greeting } from "@/components/dash/Greeting";
import { Onboarding } from "@/components/dash/Onboarding";
import { OrderDrawer } from "@/components/dash/OrderDrawer";
import { SalesChart } from "@/components/dash/SalesChart";
import { StatCard } from "@/components/dash/StatCard";
import { StatusPill } from "@/components/dash/StatusPill";
import { Timeline } from "@/components/dash/Timeline";
import { ChartCard, DashEmpty, Skeleton, WidgetError } from "@/components/dash/Widget";
import { Thumb } from "@/components/panel/StockViews";
import {
  IconAlert,
  IconBox,
  IconCart,
  IconCheck,
  IconEuro,
  IconPlug,
  IconPlus,
  IconTruck,
} from "@/components/site/Icons";
import { nowMs } from "@/server/clock";
import {
  activeShipments,
  activityFeed,
  kpis,
  orderDetail,
  recentOrders,
  salesSeries,
  stockHealth,
} from "@/server/dashboard";
import { db } from "@/server/db";
import { waitingList, registrationState } from "@/server/panel";
import { requireClient } from "@/server/session";

export const metadata = { title: "Genel Bakış" };

const STEP_MINUTES: Record<string, number> = {
  catalog: 15,
  content: 10,
  docs: 10,
  "eu-party": 5,
  asn: 10,
  team: 2,
};

type SP = { donem?: string; siparis?: string };
type Ctx = { tenantId: string; userId: string; now: number; sp: SP };

export default async function PanelHome({ searchParams }: { searchParams: Promise<SP> }) {
  const s = await requireClient();
  const sp = await searchParams;
  const tenantId = s.actor.tenantId;
  const t = forTenant(db(), tenantId);
  const now = nowMs();
  const [tenant, steps, reg, processing, inTransit] = await Promise.all([
    db().tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true, status: true, packageCode: true },
    }),
    waitingList(tenantId),
    registrationState(tenantId),
    t.order.count({ where: { status: { in: ["NEW", "ALLOCATED", "PACKED"] } } }),
    t.shipment.count({ where: { receivedAt: null, stage: { not: "FABRIKA" } } }),
  ]);
  const pkg = tenant.packageCode ? packages[tenant.packageCode as keyof typeof packages] : null;
  const summary = [
    processing ? `${processing} sipariş hazırlanıyor` : null,
    inTransit ? `${inTransit} sevkiyat yolda` : null,
  ].filter(Boolean);
  const ctx: Ctx = { tenantId, userId: s.actor.userId, now, sp };
  const canAsn = can(s.actor.role, "asn.write");
  const canCatalog = can(s.actor.role, "catalog.write");
  const statusLabel =
    tenant.status === "ACTIVE"
      ? "Aktif"
      : tenant.status === "ONBOARDING"
        ? "Kurulumda"
        : "Durduruldu";

  return (
    <div className="dash">
      <header className="dh">
        <div className="dh-main">
          <h1>
            <Greeting name={s.name.split(" ")[0] ?? s.name} />
          </h1>
          <p className="dh-sum">
            {summary.length
              ? summary.join(", ") + "."
              : "Bugün bekleyen sipariş veya yolda sevkiyat yok."}
          </p>
          <div className="dh-badges">
            <span className="pill pill-info">{pkg ? pkg.name : "Paket seçilmedi"}</span>
            <span className={`pill ${tenant.status === "ACTIVE" ? "pill-ok" : "pill-warn"}`}>
              <span className="pill-g" aria-hidden="true">
                {tenant.status === "ACTIVE" ? "✓" : "◔"}
              </span>
              {statusLabel}
            </span>
            {reg.salesLocked && (
              <Link href="/panel/sirket" className="pill pill-warn">
                <span className="pill-g" aria-hidden="true">
                  !
                </span>
                Satış, vergi kaydı tamamlanınca açılır
              </Link>
            )}
          </div>
        </div>
        <div className="dh-actions">
          {canCatalog && (
            <Link href="/panel/stok#katalog" className="btn btn-o">
              <IconPlus size={16} /> Ürün ekle
            </Link>
          )}
          {canAsn && (
            <Link href="/panel/sevkiyatlar#yeni" className="btn">
              <IconTruck size={16} /> Sevkiyat oluştur
            </Link>
          )}
        </div>
      </header>

      <Onboarding
        tenantId={tenantId}
        steps={steps.map((x) => ({ ...x, minutes: STEP_MINUTES[x.id] ?? 5 }))}
      />

      <Suspense fallback={<KpiSkeleton />}>
        <Kpis {...ctx} />
      </Suspense>

      <div className="dg">
        <div className="dg-main">
          <Suspense fallback={<Skeleton chart title="Satışlar" />}>
            <Sales {...ctx} />
          </Suspense>
          <Suspense fallback={<Skeleton rows={5} title="Son siparişler" />}>
            <Orders {...ctx} />
          </Suspense>
        </div>
        <aside className="dg-side" aria-label="Takip ve yapılacaklar">
          <Suspense fallback={<Skeleton rows={4} title="Sevkiyat takibi" />}>
            <Shipments {...ctx} />
          </Suspense>
          <Suspense fallback={<Skeleton rows={4} title="Yapılacaklar ve aktivite" />}>
            <Activity {...ctx} />
          </Suspense>
          <Suspense fallback={<Skeleton rows={5} title="Stok sağlığı" />}>
            <Stock {...ctx} />
          </Suspense>
        </aside>
      </div>

      {sp.siparis && (
        <Suspense fallback={null}>
          <OrderPanel {...ctx} id={sp.siparis} />
        </Suspense>
      )}
    </div>
  );
}

/** Widget verisi: hata olursa null döner (widget kendi hata kartını gösterir, sayfa çalışır) */
async function safe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    console.error("[genel-bakis]", (e as Error).message);
    return null;
  }
}

function qs(sp: SP, patch: Partial<SP>) {
  const p = new URLSearchParams();
  const m = { ...sp, ...patch };
  if (m.donem && m.donem !== "30") p.set("donem", m.donem);
  if (m.siparis) p.set("siparis", m.siparis);
  const s = p.toString();
  return s ? `/panel?${s}` : "/panel";
}

/* ---------------- KPI ---------------- */

function KpiSkeleton() {
  return (
    <div className="kpis" aria-busy="true" aria-label="Göstergeler yükleniyor">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="kpi">
          <div className="sk sk-row" style={{ width: "40%" }} />
          <div className="sk sk-num" />
          <div className="sk sk-row" />
        </div>
      ))}
    </div>
  );
}

async function Kpis({ tenantId, now }: Ctx) {
  const k = await safe(kpis(tenantId, new Date(now)));
  if (!k) return <WidgetError title="Göstergeler" retryHref="/panel" />;
  {
    return (
      <div className="kpis">
        <StatCard
          href="/panel/siparisler"
          icon={<IconEuro size={18} />}
          label="Ciro (30 gün)"
          value={k.revenue.value}
          format="eur"
          change={k.revenue.change}
          line={k.revenue.line}
        />
        <StatCard
          href="/panel/siparisler"
          icon={<IconCart size={18} />}
          label="Sipariş (30 gün)"
          value={k.orders.value}
          change={k.orders.change}
          line={k.orders.line}
        />
        <StatCard
          href="/panel/stok"
          icon={<IconBox size={18} />}
          label="Depodaki stok"
          value={k.stock.units}
          change={k.stock.change}
          compareLabel="30 gün önceye göre"
          line={k.stock.line}
          sub={`${fmtNum(k.stock.skus)} SKU · adet`}
        />
        <StatCard
          href="/panel/sevkiyatlar"
          icon={<IconTruck size={18} />}
          label="Yoldaki sevkiyat"
          value={k.transit.value}
          change={k.transit.change}
          compareLabel="oluşturulan, önceki 30 güne göre"
          sub={`Son 30 günde ${k.transit.created30} sevkiyat oluşturuldu`}
        />
      </div>
    );
  }
}

/* ---------------- Satış grafiği ---------------- */

async function Sales({ tenantId, now, sp }: Ctx) {
  const days = sp.donem === "7" ? 7 : sp.donem === "90" ? 90 : 30;
  const data = await safe(
    Promise.all([
      salesSeries(tenantId, days, new Date(now)),
      forTenant(db(), tenantId).marketplaceConnection.count({ where: { status: "ACTIVE" } }),
    ]),
  );
  if (!data) return <WidgetError title="Satışlar" retryHref={qs(sp, {})} />;
  const [s, conns] = data;
  {
    const seg = (
      <div className="seg" role="group" aria-label="Dönem">
        {[7, 30, 90].map((d) => (
          <Link
            key={d}
            href={qs(sp, { donem: String(d), siparis: undefined })}
            scroll={false}
            className={d === days ? "is-on" : ""}
            aria-current={d === days ? "true" : undefined}
          >
            {d}g
          </Link>
        ))}
      </div>
    );
    return (
      <ChartCard title="Satışlar" id="sales" action={seg}>
        {s.orders === 0 ? (
          <DashEmpty
            icon={<IconPlug size={20} />}
            title={conns ? `Son ${days} günde sipariş yok` : "Henüz satış verisi yok"}
            text={
              conns
                ? "Bağlı pazaryerlerinizden sipariş geldiğinde ciro burada kanal bazında görünür."
                : "Amazon.de, eBay.de veya Shopify mağazanızı bağladığınızda ciro grafiği burada oluşur."
            }
            cta={conns ? undefined : { href: "/panel/pazaryerleri", label: "Pazaryeri bağla" }}
          />
        ) : (
          <>
            <div className="sales-sum">
              <div>
                <span className="sales-v">{fmtEur(s.revenue)}</span>
                <span className="sales-l">{fmtNum(s.orders)} sipariş</span>
              </div>
              {s.revenueChange !== null && (
                <span className={`kpi-ch ${s.revenueChange >= 0 ? "is-good" : "is-bad"}`}>
                  {s.revenueChange >= 0 ? "+" : "−"}%{Math.abs(s.revenueChange)}
                  <span className="kpi-cmp"> önceki {days} güne göre</span>
                </span>
              )}
            </div>
            <SalesChart
              buckets={s.buckets.map((b) => ({
                d: b.date.toISOString(),
                total: b.total,
                byChannel: b.byChannel,
              }))}
              channels={s.channels}
            />
          </>
        )}
      </ChartCard>
    );
  }
}

/* ---------------- Son siparişler ---------------- */

async function Orders({ tenantId, now, sp }: Ctx) {
  const rows = await safe(recentOrders(tenantId, 6));
  if (!rows) return <WidgetError title="Son siparişler" retryHref={qs(sp, {})} />;
  {
    return (
      <ChartCard title="Son siparişler" id="orders" href="/panel/siparisler">
        {rows.length === 0 ? (
          <DashEmpty
            icon={<IconCart size={20} />}
            title="Henüz sipariş yok"
            text="İlk siparişiniz geldiğinde kanal, ürün, şehir ve kargo durumu burada listelenir."
          />
        ) : (
          <div className="ot" role="table" aria-label="Son siparişler">
            <div className="ot-h" role="row">
              <span role="columnheader">Sipariş</span>
              <span role="columnheader">Ürün</span>
              <span role="columnheader">Şehir</span>
              <span role="columnheader" className="ot-r">
                Tutar
              </span>
              <span role="columnheader">Durum</span>
              <span role="columnheader" className="ot-r">
                Tarih
              </span>
            </div>
            {rows.map((o) => (
              <div key={o.id} className="ot-row" role="row">
                <span role="cell" className="ot-id">
                  <ChannelBadge channel={o.channel} />
                  <Link
                    href={qs(sp, { siparis: o.id })}
                    scroll={false}
                    className="ot-link mono"
                    title={`${CHANNEL_NAME[o.channel] ?? o.channel} · ${o.externalId}`}
                  >
                    {shortId(o.externalId)}
                    <span className="sr-only"> sipariş detayını aç</span>
                  </Link>
                  <CopyButton text={o.externalId} label={`Sipariş no ${o.externalId} kopyala`} />
                </span>
                <span role="cell" className="ot-prod">
                  {o.product && (
                    <>
                      <Thumb
                        id={o.product.imageId ?? ""}
                        has={!!o.product.imageId}
                        name={o.product.name}
                      />
                      <span className="ot-pn">
                        {o.product.name}
                        {o.lines.length > 1 && <small> +{o.lines.length - 1} ürün</small>}
                        <small className="ot-mob">
                          {o.city ?? o.country} · {fmtEur(o.itemsCents, true)}
                        </small>
                      </span>
                    </>
                  )}
                </span>
                <span role="cell" className="ot-city">
                  {o.city ?? "—"}
                  {o.country !== "DE" && <small> {o.country}</small>}
                </span>
                <span role="cell" className="ot-r ot-amt">
                  {fmtEur(o.itemsCents, true)}
                </span>
                <span role="cell">
                  <StatusPill status={o.status} />
                </span>
                <span role="cell" className="ot-r ot-time">
                  <time dateTime={o.orderedAt.toISOString()} title={fmtDay(o.orderedAt)}>
                    {fmtRelative(o.orderedAt, now)}
                  </time>
                </span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    );
  }
}

async function OrderPanel({ tenantId, sp, id, now }: Ctx & { id: string }) {
  const o = await orderDetail(tenantId, id).catch(() => null);
  const close = qs(sp, { siparis: undefined });
  if (!o)
    return (
      <OrderDrawer closeHref={close} title="Sipariş bulunamadı">
        <p className="muted">Bu sipariş bulunamadı veya erişiminiz yok.</p>
      </OrderDrawer>
    );
  return (
    <OrderDrawer closeHref={close} title={`Sipariş ${shortId(o.externalId)}`}>
      <div className="drw-top">
        <ChannelBadge channel={o.channel} withName />
        <StatusPill status={o.status} />
      </div>
      <dl className="kv">
        <dt>Sipariş no</dt>
        <dd className="mono">
          {o.externalId} <CopyButton text={o.externalId} label="Sipariş no kopyala" />
        </dd>
        <dt>Tarih</dt>
        <dd>
          {fmtDay(o.orderedAt)} · {fmtRelative(o.orderedAt, now)}
        </dd>
        <dt>Teslimat</dt>
        <dd>
          {[o.zip, o.city].filter(Boolean).join(" ") || "—"} {o.country}
        </dd>
        <dt>Kargo</dt>
        <dd>{o.trackingNo ? `${o.carrier} ${o.trackingNo}` : "Henüz kargoya verilmedi"}</dd>
        {o.holdReason && (
          <>
            <dt>Bekleme nedeni</dt>
            <dd>{o.holdReason}</dd>
          </>
        )}
      </dl>
      <h3 className="drw-sub">Ürünler</h3>
      <ul className="drw-lines">
        {o.lines.map((l) => (
          <li key={l.id}>
            <Thumb id={l.imageId ?? ""} has={!!l.imageId} name={l.name} />
            <span>
              {l.name}
              <small className="mono"> {l.sku}</small>
            </span>
            <span className="ot-r">
              {l.quantity} × {l.priceCents ? fmtEur(l.priceCents, true) : "—"}
            </span>
          </li>
        ))}
      </ul>
      <div className="drw-total">
        <span>Toplam (ürünler)</span>
        <b>{fmtEur(o.itemsCents, true)}</b>
      </div>
      {o.returns.length > 0 && (
        <p className="muted" style={{ fontSize: 13 }}>
          İade: {o.returns.map((r) => `${r.quantity}× ${r.sku}`).join(", ")}
        </p>
      )}
      <Link href="/panel/siparisler" className="btn btn-o btn-sm">
        Tüm siparişler
      </Link>
    </OrderDrawer>
  );
}

/* ---------------- Sevkiyat takibi ---------------- */

async function Shipments({ tenantId, sp }: Ctx) {
  const list = await safe(activeShipments(tenantId, 3));
  if (!list) return <WidgetError title="Sevkiyat takibi" retryHref={qs(sp, {})} />;
  {
    const [main, ...rest] = list;
    return (
      <ChartCard title="Sevkiyat takibi" id="ship" href="/panel/sevkiyatlar">
        {!main ? (
          <DashEmpty
            icon={<IconTruck size={20} />}
            title="Yolda sevkiyat yok"
            text="Türkiye'den Almanya deposuna gönderdiğiniz her sevkiyatı adım adım burada izlersiniz."
            cta={{ href: "/panel/sevkiyatlar#yeni", label: "Sevkiyat oluştur" }}
          />
        ) : (
          <>
            <div className="sh-head">
              <Link href={`/panel/sevkiyatlar/${main.id}`} className="mono">
                {main.reference}
              </Link>
              <span className="muted">
                {main.pallets ? `${main.pallets} palet · ` : ""}
                {fmtNum(main.units)} adet
              </span>
            </div>
            <Timeline steps={main.steps} label={`${main.reference} sevkiyat adımları`} />
            <p className="sh-eta">
              {main.expectedAt ? (
                <>
                  Tahmini varış <b>{fmtDay(main.expectedAt)}</b>
                </>
              ) : (
                <span className="muted">Tahmini varış tarihi henüz girilmedi</span>
              )}
            </p>
            {rest.length > 0 && (
              <ul className="sh-more">
                {rest.map((r) => {
                  const cur = r.steps.find((x) => x.current);
                  return (
                    <li key={r.id}>
                      <Link href={`/panel/sevkiyatlar/${r.id}`} className="mono">
                        {r.reference}
                      </Link>
                      <span>{cur ? cur.label : "Tamamlandı"}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </ChartCard>
    );
  }
}

/* ---------------- Yapılacaklar & aktivite ---------------- */

async function Activity({ tenantId, userId, now, sp }: Ctx) {
  const data = await safe(
    Promise.all([
      activityFeed(tenantId, userId, new Date(now)),
      forTenant(db(), tenantId).document.count({ where: { internal: false } }),
    ]),
  );
  if (!data) return <WidgetError title="Yapılacaklar ve aktivite" retryHref={qs(sp, {})} />;
  const [feed, docs] = data;
  {
    const todo = [...feed.todo];
    if (docs === 0)
      todo.push({
        id: "doc-suggest",
        kind: "document",
        title: "Şirket ve ürün belgelerinizi yükleyin",
        detail: "Öneri · CE beyanı, sicil kaydı",
        at: new Date(now),
        href: "/panel/belgeler",
      });
    const empty = todo.length === 0 && feed.recent.length === 0;
    return (
      <ChartCard title="Yapılacaklar ve aktivite" id="act" href="/panel/bildirimler">
        {empty ? (
          <DashEmpty
            tone="positive"
            icon={<IconCheck size={18} />}
            title="Her şey yolunda"
            text="Sizden beklenen bir işlem veya yaklaşan son tarih yok."
          />
        ) : (
          <>
            {todo.length > 0 && (
              <>
                <h3 className="feed-sec">Sizden beklenenler</h3>
                <ActivityFeed items={todo.slice(0, 5)} now={now} />
              </>
            )}
            {feed.recent.length > 0 && (
              <>
                <h3 className="feed-sec">Son gelişmeler</h3>
                <ActivityFeed items={feed.recent.slice(0, 5)} now={now} />
              </>
            )}
          </>
        )}
      </ChartCard>
    );
  }
}

/* ---------------- Stok sağlığı ---------------- */

async function Stock({ tenantId, sp }: Ctx) {
  const h = await safe(stockHealth(tenantId));
  if (!h) return <WidgetError title="Stok sağlığı" retryHref={qs(sp, {})} />;
  {
    return (
      <ChartCard title="Stok sağlığı" id="stock" href="/panel/stok">
        {h.total === 0 ? (
          <DashEmpty
            icon={<IconBox size={20} />}
            title="Depoda ürün yok"
            text="Ürün kartlarınızı yükleyip ilk sevkiyatı bildirdiğinizde stok burada izlenir."
            cta={{ href: "/panel/stok#katalog", label: "Ürün ekle" }}
          />
        ) : (
          <>
            {h.lowCount > 0 && (
              <p className="pill pill-warn" style={{ marginBottom: 12 }}>
                <IconAlert size={14} /> {h.lowCount} ürün düşük stokta
              </p>
            )}
            <ul className="sb">
              {h.rows.map((r) => {
                const pct = Math.max(2, Math.round((Math.max(0, r.available) / h.max) * 100));
                const mark = r.lowStockAt != null ? Math.round((r.lowStockAt / h.max) * 100) : null;
                return (
                  <li key={r.id} className={r.low ? "is-low" : ""}>
                    <div className="sb-t">
                      <Link href={`/panel/stok/urun/${r.id}`} className="sb-n">
                        {r.name}
                      </Link>
                      <span className="sb-q">
                        {fmtNum(r.available)}
                        {r.low && <span className="sr-only"> düşük stok</span>}
                      </span>
                    </div>
                    <div
                      className="sb-bar"
                      role="img"
                      aria-label={`${r.sku}: kullanılabilir ${r.available}${r.lowStockAt != null ? `, eşik ${r.lowStockAt}` : ""}`}
                    >
                      <span style={{ width: `${pct}%` }} />
                      {mark !== null && <i style={{ left: `${mark}%` }} />}
                    </div>
                  </li>
                );
              })}
            </ul>
            {h.lowCount > 0 && (
              <Link
                href="/panel/sevkiyatlar#yeni"
                className="btn btn-o btn-sm"
                style={{ marginTop: 12 }}
              >
                <IconTruck size={15} /> Yeniden stok gönder
              </Link>
            )}
          </>
        )}
      </ChartCard>
    );
  }
}
