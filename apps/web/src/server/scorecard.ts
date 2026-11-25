/**
 * Partner (depo) skor kartı. Hedefler TODO(verify): SLA sözleşmesiyle netleşecek.
 */
import { db } from "./db";

export const TARGETS = { receivingAccuracyPct: 99, onTimeShipPct: 95, damagePct: 1, returnDays: 3 };

export interface Score {
  partnerId: string;
  partnerName: string;
  tenants: number;
  receivedShipments: number;
  receivingAccuracyPct: number | null;
  damagePct: number | null;
  ordersShipped: number;
  onTimeShipPct: number | null;
  avgReturnDays: number | null;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

export async function scorecards(from: Date, to: Date): Promise<Score[]> {
  const partners = await db().user.findMany({
    where: { staffRole: "PARTNER" },
    include: { partnerOf: true },
  });
  const out: Score[] = [];
  for (const p of partners) {
    const tenantIds = p.partnerOf.map((x) => x.tenantId);
    const [lines, orders, returns, received] = await Promise.all([
      db().asnLine.findMany({
        where: {
          tenantId: { in: tenantIds },
          receivedQty: { not: null },
          shipment: { receivedAt: { gte: from, lt: to } },
        },
      }),
      db().order.findMany({
        where: { tenantId: { in: tenantIds }, shippedAt: { gte: from, lt: to } },
        select: { orderedAt: true, shippedAt: true },
      }),
      db().returnItem.findMany({
        where: { tenantId: { in: tenantIds }, processedAt: { gte: from, lt: to } },
        select: { createdAt: true, processedAt: true },
      }),
      db().shipment.count({
        where: { tenantId: { in: tenantIds }, receivedAt: { gte: from, lt: to } },
      }),
    ]);
    const exact = lines.filter((l) => l.receivedQty === l.quantity).length;
    const units = lines.reduce((s, l) => s + (l.receivedQty ?? 0), 0);
    const damaged = lines.reduce((s, l) => s + l.damagedQty, 0);
    const onTime = orders.filter(
      (o) => o.shippedAt && o.shippedAt.getTime() - o.orderedAt.getTime() <= 24 * 3600_000,
    ).length;
    const retDays = returns.map(
      (r) => (r.processedAt!.getTime() - r.createdAt.getTime()) / 86_400_000,
    );
    out.push({
      partnerId: p.id,
      partnerName: p.name,
      tenants: tenantIds.length,
      receivedShipments: received,
      receivingAccuracyPct: pct(exact, lines.length),
      damagePct: pct(damaged, units),
      ordersShipped: orders.length,
      onTimeShipPct: pct(onTime, orders.length),
      avgReturnDays: retDays.length
        ? Math.round((retDays.reduce((a, b) => a + b, 0) / retDays.length) * 10) / 10
        : null,
    });
  }
  return out;
}
