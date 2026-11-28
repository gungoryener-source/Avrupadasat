import Link from "next/link";
import { Suspense } from "react";
import { packages } from "@avrupadasat/core/pricing";
import { can } from "@avrupadasat/core/roles";
import { forTenant } from "@avrupadasat/db";
import { ActivityFeed } from "@/components/dash/ActivityFeed";
import { ChannelBadge, CHANNEL_NAME } from "@/components/dash/ChannelBadge";
import { CopyButton } from "@/components/dash/CopyButton";
import { formatter, shortId } from "@/components/dash/format";
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
  type FeedItem,
} from "@/server/dashboard";
import { db } from "@/server/db";
import { waitingList, registrationState } from "@/server/panel";
import { requireClient } from "@/server/session";
import { getT } from "@/i18n/server";
import { INTL_LOCALE, type DictKey, type Locale, type T } from "@/i18n/dict";
import { trackingUrl } from "@/server/tracking";

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
type Ctx = {
  tenantId: string;
  userId: string;
  now: number;
  sp: SP;
  t: T;
  locale: Locale;
  f: ReturnType<typeof formatter>;
};

export default async function PanelHome({ searchParams }: { searchParams: Promise<SP> }) {
  const s = await requireClient();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const f = formatter(locale);
  const tenantId = s.actor.tenantId;
  const tdb = forTenant(db(), tenantId);
  const now = nowMs();
  const [tenant, steps, reg, processing, inTransit] = await Promise.all([
    db().tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { name: true, status: true, packageCode: true },
    }),
    waitingList(tenantId),
    registrationState(tenantId),
    tdb.order.count({ where: { status: { in: ["NEW", "ALLOCATED", "PACKED"] } } }),
    tdb.shipment.count({ where: { receivedAt: null, stage: { not: "FABRIKA" } } }),
  ]);
  const pkg = tenant.packageCode ? packages[tenant.packageCode as keyof typeof packages] : null;
  const summary = [
    processing ? t("dash.processing", { n: processing }) : null,
    inTransit ? t("dash.inTransit", { n: inTransit }) : null,
  ].filter(Boolean);
  const ctx: Ctx = { tenantId, userId: s.actor.userId, now, sp, t, locale, f };
  const canAsn = can(s.actor.role, "asn.write");
  const canCatalog = can(s.actor.role, "catalog.write");
  const statusLabel =
    tenant.status === "ACTIVE"
      ? t("dash.active")
      : tenant.status === "ONBOARDING"
        ? t("dash.onboarding")
        : t("dash.paused");

  return (
    <div className="dash">
      <header className="dh">
        <div className="dh-main">
          <p className="dh-eyebrow">{t("nav.overview")}</p>
          <h1>
            <Greeting
              name={s.name.split(" ")[0] ?? s.name}
              w={{
                morning: t("greet.morning"),
                day: t("greet.day"),
                evening: t("greet.evening"),
                night: t("greet.night"),
                neutral: t("greet.neutral"),
              }}
            />
          </h1>
          <p className="dh-sum">{summary.length ? summary.join(", ") + "." : t("dash.allQuiet")}</p>
          <div className="dh-badges">
            <span className="pill pill-info">{pkg ? pkg.name : t("shell.noPlan")}</span>
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
                {t("dash.salesLocked")}
              </Link>
            )}
          </div>
        </div>
        <div className="dh-actions">
          {canCatalog && (
            <Link href="/panel/stok#katalog" className="btn btn-o">
              <IconPlus size={16} /> {t("dash.addProduct")}
            </Link>
          )}
          {canAsn && (
            <Link href="/panel/sevkiyatlar#yeni" className="btn">
              <IconTruck size={16} /> {t("dash.createShipment")}
            </Link>
          )}
        </div>
      </header>

      <Onboarding
        tenantId={tenantId}
        steps={steps.map((x) => ({
          ...x,
          title: t(`onb.step.${x.id}` as DictKey),
          minutes: STEP_MINUTES[x.id] ?? 5,
        }))}
        s={{
          title: t("onb.title"),
          done: t("onb.done"),
          doneText: t("onb.doneText"),
          left: t("onb.left"),
          cont: t("onb.continue"),
          close: t("onb.close"),
          min: t("onb.min"),
          completed: t("onb.completed"),
        }}
      />

      <Suspense fallback={<KpiSkeleton label={t("kpi.loading")} />}>
        <Kpis {...ctx} />
      </Suspense>

      <div className="dg">
        <div className="dg-main">
          <Suspense fallback={<Skeleton chart title={t("sales.title")} />}>
            <Sales {...ctx} />
          </Suspense>
          <Suspense fallback={<Skeleton rows={5} title={t("orders.title")} />}>
            <Orders {...ctx} />
          </Suspense>
        </div>
        <aside className="dg-side" aria-label={t("aside.label")}>
          <Suspense fallback={<Skeleton rows={4} title={t("ship.title")} />}>
            <Shipments {...ctx} />
          </Suspense>
          <Suspense fallback={<Skeleton rows={4} title={t("act.title")} />}>
            <Activity {...ctx} />
          </Suspense>
          <Suspense fallback={<Skeleton rows={5} title={t("stock.title")} />}>
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

function werr(t: T) {
  return { error: t("w.loadError"), text: t("w.loadErrorText"), retry: t("w.retry") };
}

function kpiProps(t: T, locale: Locale) {
  return {
    labels: { new: t("kpi.new"), noData: t("kpi.noData"), noPrev: t("kpi.noPrev") },
    intlLocale: INTL_LOCALE[locale],
    compareLabel: t("kpi.vsPrev30"),
  };
}

function feedProps(t: T, f: ReturnType<typeof formatter>) {
  return {
    kinds: {
      task: t("act.kind.task"),
      deadline: t("act.kind.deadline"),
      ticket: t("act.kind.ticket"),
      notification: t("act.kind.notification"),
      document: t("act.kind.document"),
    },
    words: { soon: t("act.soon"), unread: t("act.unread") },
    fmt: f,
  };
}

/** Sistem üretimi akış açıklamaları ve beyan adları çevrilir; kullanıcı içeriği (görev başlığı) çevrilmez */
function localizeFeed(items: FeedItem[], t: T): FeedItem[] {
  return items.map((i) => {
    if (i.kind === "deadline") {
      const [code, period] = (i.code ?? "").split("|");
      return {
        ...i,
        title: code ? `${t(`tax.${code}` as DictKey)} · ${period}` : i.title,
        detail: t("act.d.deadline"),
      };
    }
    if (i.kind === "task")
      return { ...i, detail: t(i.code === "due" ? "act.d.taskDue" : "act.d.task") };
    if (i.kind === "ticket") return { ...i, detail: t("act.d.ticket") };
    return i;
  });
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

function KpiSkeleton({ label }: { label: string }) {
  return (
    <div className="kpis" aria-busy="true" aria-label={label}>
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

async function Kpis({ tenantId, now, t, locale, f }: Ctx) {
  const k = await safe(kpis(tenantId, new Date(now)));
  if (!k) return <WidgetError title={t("kpi.title")} retryHref="/panel" w={werr(t)} />;
  {
    return (
      <div className="kpis">
        <StatCard
          {...kpiProps(t, locale)}
          href="/panel/siparisler"
          icon={<IconEuro size={18} />}
          label={t("kpi.revenue")}
          value={k.revenue.value}
          format="eur"
          change={k.revenue.change}
          line={k.revenue.line}
        />
        <StatCard
          {...kpiProps(t, locale)}
          href="/panel/siparisler"
          icon={<IconCart size={18} />}
          label={t("kpi.orders")}
          value={k.orders.value}
          change={k.orders.change}
          line={k.orders.line}
        />
        <StatCard
          {...kpiProps(t, locale)}
          href="/panel/stok"
          icon={<IconBox size={18} />}
          label={t("kpi.stock")}
          value={k.stock.units}
          change={k.stock.change}
          compareLabel={t("kpi.vs30ago")}
          line={k.stock.line}
          sub={t("kpi.skuUnits", { n: f.num(k.stock.skus) })}
        />
        <StatCard
          {...kpiProps(t, locale)}
          href="/panel/sevkiyatlar"
          icon={<IconTruck size={18} />}
          label={t("kpi.transit")}
          value={k.transit.value}
          change={k.transit.change}
          compareLabel={t("kpi.vsCreated")}
          sub={t("kpi.created30", { n: k.transit.created30 })}
        />
      </div>
    );
  }
}

/* ---------------- Satış grafiği ---------------- */

async function Sales({ tenantId, now, sp, t, locale, f }: Ctx) {
  const days = sp.donem === "7" ? 7 : sp.donem === "90" ? 90 : 30;
  const data = await safe(
    Promise.all([
      salesSeries(tenantId, days, new Date(now)),
      forTenant(db(), tenantId).marketplaceConnection.count({ where: { status: "ACTIVE" } }),
    ]),
  );
  if (!data) return <WidgetError title={t("sales.title")} retryHref={qs(sp, {})} w={werr(t)} />;
  const [s, conns] = data;
  {
    const seg = (
      <div className="seg" role="group" aria-label={t("sales.period")}>
        {[7, 30, 90].map((d) => (
          <Link
            key={d}
            href={qs(sp, { donem: String(d), siparis: undefined })}
            scroll={false}
            className={d === days ? "is-on" : ""}
            aria-current={d === days ? "true" : undefined}
          >
            {t("sales.days", { n: d })}
          </Link>
        ))}
      </div>
    );
    return (
      <ChartCard title={t("sales.title")} id="sales" action={seg}>
        {s.orders === 0 ? (
          <DashEmpty
            icon={<IconPlug size={20} />}
            title={conns ? t("sales.noneConnTitle", { n: days }) : t("sales.noneTitle")}
            text={conns ? t("sales.noneConnText") : t("sales.noneText")}
            cta={conns ? undefined : { href: "/panel/pazaryerleri", label: t("sales.connect") }}
          />
        ) : (
          <>
            <div className="sales-sum">
              <div>
                <span className="sales-v">{f.eur(s.revenue)}</span>
                <span className="sales-l">{t("sales.orders", { n: f.num(s.orders) })}</span>
              </div>
              {s.revenueChange !== null && (
                <span className={`kpi-ch ${s.revenueChange >= 0 ? "is-good" : "is-bad"}`}>
                  {new Intl.NumberFormat(INTL_LOCALE[locale], {
                    style: "percent",
                    signDisplay: "exceptZero",
                  }).format(s.revenueChange / 100)}
                  <span className="kpi-cmp"> {t("sales.vsPrev", { n: days })}</span>
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
              locale={INTL_LOCALE[locale]}
              seriesLabel={t("sales.series")}
              summaryTpl={t("sales.summary")}
            />
          </>
        )}
      </ChartCard>
    );
  }
}

/* ---------------- Son siparişler ---------------- */

async function Orders({ tenantId, now, sp, t, f }: Ctx) {
  const rows = await safe(recentOrders(tenantId, 6));
  if (!rows) return <WidgetError title={t("orders.title")} retryHref={qs(sp, {})} w={werr(t)} />;
  {
    return (
      <ChartCard
        title={t("orders.title")}
        id="orders"
        href="/panel/siparisler"
        hrefLabel={t("dash.all")}
      >
        {rows.length === 0 ? (
          <DashEmpty
            icon={<IconCart size={20} />}
            title={t("orders.noneTitle")}
            text={t("orders.noneText")}
          />
        ) : (
          <div className="ot" role="table" aria-label={t("orders.title")}>
            <div className="ot-h" role="row">
              <span role="columnheader">{t("orders.col.order")}</span>
              <span role="columnheader">{t("orders.col.product")}</span>
              <span role="columnheader">{t("orders.col.city")}</span>
              <span role="columnheader" className="ot-r">
                {t("orders.col.amount")}
              </span>
              <span role="columnheader">{t("orders.col.status")}</span>
              <span role="columnheader" className="ot-r">
                {t("orders.col.date")}
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
                    <span className="sr-only"> {t("orders.open")}</span>
                  </Link>
                  <CopyButton
                    text={o.externalId}
                    label={t("orders.copy", { id: o.externalId })}
                    copied={t("orders.copied")}
                  />
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
                        {o.lines.length > 1 && (
                          <small> {t("orders.more", { n: o.lines.length - 1 })}</small>
                        )}
                        <small className="ot-mob">
                          {o.city ?? o.country} · {f.eur(o.itemsCents, true)}
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
                  {f.eur(o.itemsCents, true)}
                </span>
                <span role="cell">
                  <StatusPill status={o.status} label={t(`status.${o.status}` as DictKey)} />
                </span>
                <span role="cell" className="ot-r ot-time">
                  <time dateTime={o.orderedAt.toISOString()} title={f.day(o.orderedAt)}>
                    {f.relative(o.orderedAt, now)}
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

async function OrderPanel({ tenantId, sp, id, now, t, f }: Ctx & { id: string }) {
  const o = await orderDetail(tenantId, id).catch(() => null);
  const close = qs(sp, { siparis: undefined });
  if (!o)
    return (
      <OrderDrawer closeHref={close} title={t("drawer.notFound")} closeLabel={t("drawer.close")}>
        <p className="muted">{t("drawer.notFoundText")}</p>
      </OrderDrawer>
    );
  return (
    <OrderDrawer
      closeHref={close}
      title={t("drawer.order", { id: shortId(o.externalId) })}
      closeLabel={t("drawer.close")}
    >
      <div className="drw-top">
        <ChannelBadge channel={o.channel} withName />
        <StatusPill status={o.status} label={t(`status.${o.status}` as DictKey)} />
      </div>
      <dl className="kv">
        <dt>{t("drawer.no")}</dt>
        <dd className="mono">
          {o.externalId}{" "}
          <CopyButton
            text={o.externalId}
            label={t("orders.copy", { id: o.externalId })}
            copied={t("orders.copied")}
          />
        </dd>
        <dt>{t("drawer.date")}</dt>
        <dd>
          {f.day(o.orderedAt)} · {f.relative(o.orderedAt, now)}
        </dd>
        <dt>{t("drawer.delivery")}</dt>
        <dd>
          {[o.zip, o.city].filter(Boolean).join(" ") || "—"} {o.country}
        </dd>
        <dt>{t("drawer.carrier")}</dt>
        <dd>
          {o.trackingNo ? (
            <>
              {o.carrier} <span className="mono">{o.trackingNo}</span>
              {trackingUrl(o.carrier, o.trackingNo) && (
                <>
                  {" · "}
                  <a
                    href={trackingUrl(o.carrier, o.trackingNo)!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("drawer.track")}
                  </a>
                </>
              )}
            </>
          ) : (
            t("drawer.notShipped")
          )}
        </dd>
        {o.shippedAt && (
          <>
            <dt>{t("drawer.shippedAt")}</dt>
            <dd>{f.day(o.shippedAt)}</dd>
          </>
        )}
        {o.deliveredAt && (
          <>
            <dt>{t("drawer.deliveredAt")}</dt>
            <dd>{f.day(o.deliveredAt)}</dd>
          </>
        )}
        {o.returnedAt && (
          <>
            <dt>{t("drawer.returnedAt")}</dt>
            <dd>{f.day(o.returnedAt)}</dd>
          </>
        )}
        {o.holdReason && (
          <>
            <dt>{t("drawer.hold")}</dt>
            <dd>{o.holdReason}</dd>
          </>
        )}
      </dl>
      <h3 className="drw-sub">{t("drawer.items")}</h3>
      <ul className="drw-lines">
        {o.lines.map((l) => (
          <li key={l.id}>
            <Thumb id={l.imageId ?? ""} has={!!l.imageId} name={l.name} />
            <span>
              {l.name}
              <small className="mono"> {l.sku}</small>
            </span>
            <span className="ot-r">
              {l.quantity} × {l.priceCents ? f.eur(l.priceCents, true) : "—"}
            </span>
          </li>
        ))}
      </ul>
      <div className="drw-total">
        <span>{t("drawer.total")}</span>
        <b>{f.eur(o.itemsCents, true)}</b>
      </div>
      {o.returns.length > 0 && (
        <p className="muted" style={{ fontSize: 13 }}>
          {t("drawer.returns")}: {o.returns.map((r) => `${r.quantity}× ${r.sku}`).join(", ")}
        </p>
      )}
      <Link href="/panel/siparisler" className="btn btn-o btn-sm">
        {t("drawer.allOrders")}
      </Link>
    </OrderDrawer>
  );
}

/* ---------------- Sevkiyat takibi ---------------- */

async function Shipments({ tenantId, sp, t, f }: Ctx) {
  const list = await safe(activeShipments(tenantId, 3));
  if (!list) return <WidgetError title={t("ship.title")} retryHref={qs(sp, {})} w={werr(t)} />;
  {
    const [main, ...rest] = list;
    return (
      <ChartCard
        title={t("ship.title")}
        id="ship"
        href="/panel/sevkiyatlar"
        hrefLabel={t("dash.all")}
      >
        {!main ? (
          <DashEmpty
            icon={<IconTruck size={20} />}
            title={t("ship.noneTitle")}
            text={t("ship.noneText")}
            cta={{ href: "/panel/sevkiyatlar#yeni", label: t("dash.createShipment") }}
          />
        ) : (
          <>
            <div className="sh-head">
              <Link href={`/panel/sevkiyatlar/${main.id}`} className="mono">
                {main.reference}
              </Link>
              <span className="muted">
                {main.pallets ? `${t("ship.pallets", { n: main.pallets })} · ` : ""}
                {t("ship.units", { n: f.num(main.units) })}
              </span>
            </div>
            <Timeline
              steps={main.steps.map((x) => ({ ...x, label: t(`ship.step.${x.key}` as DictKey) }))}
              label={t("ship.steps", { ref: main.reference })}
              words={{
                now: t("ship.now"),
                done: t("ship.stepDone"),
                current: t("ship.stepCurrent"),
                waiting: t("ship.stepWaiting"),
              }}
              fmtDayMonth={f.dayMonth}
            />
            <p className="sh-eta">
              {main.expectedAt ? (
                <>
                  {t("ship.eta")} <b>{f.day(main.expectedAt)}</b>
                </>
              ) : (
                <span className="muted">{t("ship.noEta")}</span>
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
                      <span>{cur ? t(`ship.step.${cur.key}` as DictKey) : t("ship.done")}</span>
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

async function Activity({ tenantId, userId, now, sp, t, f }: Ctx) {
  const data = await safe(
    Promise.all([
      activityFeed(tenantId, userId, new Date(now)),
      forTenant(db(), tenantId).document.count({ where: { internal: false } }),
    ]),
  );
  if (!data) return <WidgetError title={t("act.title")} retryHref={qs(sp, {})} w={werr(t)} />;
  const [feed, docs] = data;
  {
    const todo = [...feed.todo];
    if (docs === 0)
      todo.push({
        id: "doc-suggest",
        kind: "document",
        title: t("act.docSuggest"),
        detail: t("act.d.docSuggest"),
        at: new Date(now),
        href: "/panel/belgeler",
      });
    const empty = todo.length === 0 && feed.recent.length === 0;
    return (
      <ChartCard
        title={t("act.title")}
        id="act"
        href="/panel/bildirimler"
        hrefLabel={t("dash.all")}
      >
        {empty ? (
          <DashEmpty
            tone="positive"
            icon={<IconCheck size={18} />}
            title={t("act.allGood")}
            text={t("act.allGoodText")}
          />
        ) : (
          <>
            {todo.length > 0 && (
              <>
                <h3 className="feed-sec">{t("act.todo")}</h3>
                <ActivityFeed
                  items={localizeFeed(todo.slice(0, 5), t)}
                  now={now}
                  {...feedProps(t, f)}
                />
              </>
            )}
            {feed.recent.length > 0 && (
              <>
                <h3 className="feed-sec">{t("act.recent")}</h3>
                <ActivityFeed items={feed.recent.slice(0, 5)} now={now} {...feedProps(t, f)} />
              </>
            )}
          </>
        )}
      </ChartCard>
    );
  }
}

/* ---------------- Stok sağlığı ---------------- */

async function Stock({ tenantId, sp, t, f }: Ctx) {
  const h = await safe(stockHealth(tenantId));
  if (!h) return <WidgetError title={t("stock.title")} retryHref={qs(sp, {})} w={werr(t)} />;
  {
    return (
      <ChartCard title={t("stock.title")} id="stock" href="/panel/stok" hrefLabel={t("dash.all")}>
        {h.total === 0 ? (
          <DashEmpty
            icon={<IconBox size={20} />}
            title={t("stock.noneTitle")}
            text={t("stock.noneText")}
            cta={{ href: "/panel/stok#katalog", label: t("dash.addProduct") }}
          />
        ) : (
          <>
            {h.lowCount > 0 && (
              <p className="pill pill-warn" style={{ marginBottom: 12 }}>
                <IconAlert size={14} /> {t("stock.low", { n: h.lowCount })}
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
                        {f.num(r.available)}
                        {r.low && <span className="sr-only"> {t("stock.lowSr")}</span>}
                      </span>
                    </div>
                    <div
                      className="sb-bar"
                      role="img"
                      aria-label={
                        t("stock.bar", { sku: r.sku, n: r.available }) +
                        (r.lowStockAt != null ? t("stock.barLimit", { n: r.lowStockAt }) : "")
                      }
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
                <IconTruck size={15} /> {t("stock.restock")}
              </Link>
            )}
          </>
        )}
      </ChartCard>
    );
  }
}
