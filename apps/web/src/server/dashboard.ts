/**
 * Müşteri Genel Bakış verileri. Tamamı veritabanından hesaplanır; örnek/uydurma değer yoktur.
 * Trendler: son N gün ile ondan önceki N gün karşılaştırılır (iptal siparişler hariç).
 */
import { forTenant } from "@avrupadasat/db";
import { decryptField } from "@avrupadasat/db/crypto";
import { db } from "./db";
import { listNotifications } from "./notifications";

const DAY = 86_400_000;
export const CHANNELS = ["AMAZON", "EBAY", "WEBSHOP", "MANUAL"] as const;
export type Channel = (typeof CHANNELS)[number];

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return Math.round(((cur - prev) / prev) * 100);
}

/** Günlük ciro ve sipariş sayısı (kanala göre), son `days` gün + önceki dönem toplamları */
export async function salesSeries(tenantId: string, days: number, now = new Date()) {
  const end = startOfDayUTC(new Date(now.getTime() + DAY)); // yarın 00:00 (bugün dahil)
  const from = new Date(end.getTime() - days * DAY);
  const prevFrom = new Date(from.getTime() - days * DAY);
  const orders = await forTenant(db(), tenantId).order.findMany({
    where: { status: { not: "CANCELLED" }, orderedAt: { gte: prevFrom, lt: end } },
    select: { orderedAt: true, itemsCents: true, channel: true },
  });
  const buckets = Array.from({ length: days }, (_, i) => ({
    date: new Date(from.getTime() + i * DAY),
    total: 0,
    orders: 0,
    byChannel: Object.fromEntries(CHANNELS.map((c) => [c, 0])) as Record<Channel, number>,
  }));
  let prevRevenue = 0;
  let prevOrders = 0;
  for (const o of orders) {
    if (o.orderedAt < from) {
      prevRevenue += o.itemsCents;
      prevOrders++;
      continue;
    }
    const b = buckets[Math.floor((o.orderedAt.getTime() - from.getTime()) / DAY)];
    if (!b) continue;
    b.total += o.itemsCents;
    b.orders++;
    b.byChannel[o.channel as Channel] += o.itemsCents;
  }
  const revenue = buckets.reduce((a, b) => a + b.total, 0);
  const count = buckets.reduce((a, b) => a + b.orders, 0);
  const channels = CHANNELS.filter((c) => buckets.some((b) => b.byChannel[c] > 0));
  return {
    days,
    buckets,
    channels,
    revenue,
    orders: count,
    prevRevenue,
    prevOrders,
    revenueChange: pctChange(revenue, prevRevenue),
    ordersChange: pctChange(count, prevOrders),
  };
}

/** KPI'lar: ciro, sipariş, stok, yoldaki sevkiyat (+ 30 günlük sparkline) */
export async function kpis(tenantId: string, now = new Date()) {
  const t = forTenant(db(), tenantId);
  const [sales, stock, inTransit, moves30, shipmentsPrev] = await Promise.all([
    salesSeries(tenantId, 30, now),
    t.stockItem.aggregate({ _sum: { quantity: true }, _count: true }),
    t.shipment.count({ where: { stage: { not: "DEPO_KABUL" } } }),
    t.stockMovement.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - 30 * DAY) }, delta: { not: 0 } },
      select: { createdAt: true, delta: true },
    }),
    t.shipment.count({
      where: {
        createdAt: {
          gte: new Date(now.getTime() - 60 * DAY),
          lt: new Date(now.getTime() - 30 * DAY),
        },
      },
    }),
  ]);
  // Stok sparkline: bugünkü stoktan geriye doğru hareketleri geri sararak günlük stok seviyesi
  const units = stock._sum.quantity ?? 0;
  const dailyDelta = new Array(30).fill(0) as number[];
  const start = startOfDayUTC(new Date(now.getTime() - 29 * DAY)).getTime();
  for (const m of moves30) {
    const i = Math.floor((m.createdAt.getTime() - start) / DAY);
    if (i >= 0 && i < 30) dailyDelta[i] = (dailyDelta[i] ?? 0) + m.delta;
  }
  const stockLine: number[] = new Array(30).fill(0);
  let level = units;
  for (let i = 29; i >= 0; i--) {
    stockLine[i] = level;
    level -= dailyDelta[i]!;
  }
  const stock30Ago = level;
  const shipments30 = await t.shipment.count({
    where: { createdAt: { gte: new Date(now.getTime() - 30 * DAY) } },
  });
  return {
    revenue: {
      value: sales.revenue,
      change: sales.revenueChange,
      line: sales.buckets.map((b) => b.total),
    },
    orders: {
      value: sales.orders,
      change: sales.ordersChange,
      line: sales.buckets.map((b) => b.orders),
    },
    stock: {
      units,
      skus: stock._count,
      change: pctChange(units, stock30Ago),
      line: stockLine,
    },
    transit: {
      value: inTransit,
      created30: shipments30,
      change: pctChange(shipments30, shipmentsPrev),
    },
  };
}

export type RecentOrder = Awaited<ReturnType<typeof recentOrders>>[number];

/** Son siparişler: şehir (şifreli adresten), ilk ürünün adı/görseli */
export async function recentOrders(tenantId: string, take = 6) {
  const t = forTenant(db(), tenantId);
  const orders = await t.order.findMany({
    orderBy: { orderedAt: "desc" },
    take,
    include: { lines: { select: { sku: true, quantity: true, priceCents: true } } },
  });
  const skus = [...new Set(orders.flatMap((o) => o.lines.map((l) => l.sku)))];
  const items = skus.length
    ? await t.stockItem.findMany({
        where: { sku: { in: skus } },
        select: { id: true, sku: true, name: true, imageKey: true },
      })
    : [];
  const bySku = new Map(items.map((i) => [i.sku, i]));
  return orders.map((o) => {
    let city: string | null = null;
    try {
      city = (JSON.parse(decryptField(o.shipToEnc)) as { city?: string }).city ?? null;
    } catch {
      city = null;
    }
    const first = o.lines[0];
    const product = first ? bySku.get(first.sku) : undefined;
    return {
      id: o.id,
      channel: o.channel,
      externalId: o.externalId,
      status: o.status,
      itemsCents: o.itemsCents,
      orderedAt: o.orderedAt,
      shippedAt: o.shippedAt,
      carrier: o.carrier,
      trackingNo: o.trackingNo,
      holdReason: o.holdReason,
      country: o.country,
      city,
      units: o.lines.reduce((a, l) => a + l.quantity, 0),
      lines: o.lines.map((l) => ({ ...l, name: bySku.get(l.sku)?.name ?? l.sku })),
      product: first
        ? {
            sku: first.sku,
            name: product?.name ?? first.sku,
            imageId: product?.imageKey ? product.id : null,
          }
        : null,
    };
  });
}

/** Tek sipariş detayı (çekmece) — kiracı kapsamlı */
export async function orderDetail(tenantId: string, id: string) {
  const t = forTenant(db(), tenantId);
  const o = await t.order.findFirst({
    where: { id },
    include: { lines: true, returns: { select: { sku: true, quantity: true, status: true } } },
  });
  if (!o) return null;
  const skus = o.lines.map((l) => l.sku);
  const items = await t.stockItem.findMany({
    where: { sku: { in: skus } },
    select: { id: true, sku: true, name: true, imageKey: true },
  });
  const bySku = new Map(items.map((i) => [i.sku, i]));
  let to: { name?: string; city?: string; zip?: string; country?: string } = {};
  try {
    to = JSON.parse(decryptField(o.shipToEnc));
  } catch {
    to = {};
  }
  return {
    ...o,
    // Alıcı adı ve sokak adresi kişisel veri: çekmecede yalnız şehir/posta kodu gösterilir
    city: to.city ?? null,
    zip: to.zip ?? null,
    lines: o.lines.map((l) => {
      const i = bySku.get(l.sku);
      return { ...l, name: i?.name ?? l.sku, imageId: i?.imageKey ? i.id : null };
    }),
  };
}

export const TRACK_STEPS = [
  { key: "TR_CIKIS", label: "Türkiye çıkış" },
  { key: "AB_GIRIS", label: "Transit (AB girişi)" },
  { key: "GUMRUK", label: "Gümrük" },
  { key: "DEPO_KABUL", label: "DE depo kabul" },
  { key: "STOK", label: "Stoğa girdi" },
] as const;

/** Aktif sevkiyatlar (en yakın varış önce) ve aşama tarihleri */
export async function activeShipments(tenantId: string, take = 3) {
  const t = forTenant(db(), tenantId);
  const list = await t.shipment.findMany({
    where: { receivedAt: null },
    orderBy: [{ expectedAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take,
    include: {
      events: { orderBy: { at: "asc" }, select: { stage: true, at: true } },
      lines: { select: { quantity: true } },
    },
  });
  const order = ["FABRIKA", "TR_CIKIS", "AB_GIRIS", "GUMRUK", "DEPO_KABUL"];
  return list.map((s) => {
    const reached = order.indexOf(s.stage); // FABRIKA = 0 → henüz Türkiye çıkışı yok
    const at = (k: string) => s.events.filter((e) => e.stage === k).at(-1)?.at ?? null;
    const steps = TRACK_STEPS.map((step, i) => {
      const stageIndex = i + 1; // TR_CIKIS = 1 …
      const done = step.key === "STOK" ? !!s.receivedAt : reached >= stageIndex;
      return {
        ...step,
        done,
        current: false,
        at: step.key === "STOK" ? s.receivedAt : at(step.key),
      };
    });
    const firstOpen = steps.findIndex((x) => !x.done);
    if (firstOpen >= 0) steps[firstOpen]!.current = true;
    return {
      id: s.id,
      reference: s.reference,
      stage: s.stage,
      pallets: s.pallets,
      units: s.lines.reduce((a, l) => a + l.quantity, 0),
      expectedAt: s.expectedAt,
      carrier: s.carrier,
      steps,
    };
  });
}

export type FeedItem = {
  id: string;
  kind: "task" | "deadline" | "ticket" | "notification" | "document";
  title: string;
  detail?: string;
  at: Date;
  href: string;
  urgent?: boolean;
  unread?: boolean;
  /** Arayüzün çevirebilmesi için sistem kodu (ör. beyan türü|dönem, "due") */
  code?: string;
};

/** Görev, son tarih, destek ve bildirimleri tek akışta birleştirir */
export async function activityFeed(
  tenantId: string,
  userId: string,
  now = new Date(),
): Promise<{ todo: FeedItem[]; recent: FeedItem[] }> {
  const t = forTenant(db(), tenantId);
  const [tasks, filings, tickets, notes] = await Promise.all([
    t.task.findMany({
      where: { customerVisible: true, status: { not: "COMPLETED" } },
      select: { id: true, title: true, dueAt: true, customerAction: true, createdAt: true },
      orderBy: [{ customerAction: "desc" }, { dueAt: { sort: "asc", nulls: "last" } }],
      take: 8,
    }),
    t.taxFiling.findMany({
      where: { status: { not: "COMPLETED" }, dueAt: { lte: new Date(now.getTime() + 45 * DAY) } },
      orderBy: { dueAt: "asc" },
      take: 5,
    }),
    t.ticket.findMany({
      where: { status: "WAITING_CUSTOMER" },
      select: { id: true, number: true, subject: true, lastActivity: true },
      take: 5,
    }),
    listNotifications(userId, { take: 8 }),
  ]);
  const todo: FeedItem[] = [
    ...tasks
      .filter((x) => x.customerAction)
      .map((x) => ({
        id: `t-${x.id}`,
        kind: "task" as const,
        title: x.title,
        detail: x.dueAt ? "Sizden bekleniyor · son tarih" : "Sizden bekleniyor",
        code: x.dueAt ? "due" : undefined,
        at: x.dueAt ?? x.createdAt,
        href: "/panel/gorevler",
        urgent: !!x.dueAt && x.dueAt.getTime() < now.getTime() + 2 * DAY,
      })),
    ...filings.map((f) => ({
      id: `f-${f.id}`,
      kind: "deadline" as const,
      title: `${filingLabel(f.kind)} · ${f.period}`,
      detail: "Beyan son tarihi",
      code: `${f.kind}|${f.period}`,
      at: f.dueAt,
      href: "/panel/vergi",
      urgent: f.dueAt.getTime() < now.getTime() + 5 * DAY,
    })),
    ...tickets.map((x) => ({
      id: `k-${x.id}`,
      kind: "ticket" as const,
      title: `#${x.number} ${x.subject}`,
      detail: "Destek ekibi yanıtınızı bekliyor",
      at: x.lastActivity,
      href: `/panel/destek/${x.id}`,
    })),
  ].sort((a, b) => +a.at - +b.at);
  const recent: FeedItem[] = notes.items.map((n) => ({
    id: `n-${n.id}`,
    kind: "notification" as const,
    title: n.title,
    detail: n.body ?? undefined,
    at: n.createdAt,
    href: n.href ?? "/panel/bildirimler",
    unread: !n.readAt,
  }));
  return { todo, recent };
}

function filingLabel(kind: string) {
  return (
    (
      {
        UST_VA: "KDV ön beyanı",
        ZM: "Özet beyan (ZM)",
        UST_JAHR: "Yıllık KDV beyanı",
        JAHRESABSCHLUSS: "Yıl sonu bilançosu",
      } as Record<string, string>
    )[kind] ?? kind
  );
}

/** Stok sağlığı: kullanılabilir adede göre en düşük 5 ürün + eşik durumu */
export async function stockHealth(tenantId: string) {
  const items = await forTenant(db(), tenantId).stockItem.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      quantity: true,
      reserved: true,
      lowStockAt: true,
      imageKey: true,
    },
  });
  const rows = items
    .map((i) => ({
      ...i,
      available: i.quantity - i.reserved,
      low: i.lowStockAt != null && i.quantity - i.reserved <= i.lowStockAt,
    }))
    .sort((a, b) => Number(b.low) - Number(a.low) || a.available - b.available);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.available, r.lowStockAt ?? 0)));
  return {
    total: rows.length,
    lowCount: rows.filter((r) => r.low).length,
    rows: rows.slice(0, 5),
    max,
  };
}
