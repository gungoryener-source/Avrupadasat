/**
 * Firma bazında hizmet seviyesi ölçümü (Kapı 0 K0-3). Hedefler core/sla.ts'de.
 * Mal kabul: gümrük aşamasından depo kabulüne (depo kapısına varış ayrıca tutulmuyor).
 */
import {
  businessDaysBetween,
  isShippedOnTime,
  metric,
  SLA_TARGETS,
  type SlaMetric,
} from "@avrupadasat/core/sla";
import { forTenant } from "@avrupadasat/db";
import { db } from "./db";

export interface SlaSummary {
  days: number;
  inbound: SlaMetric;
  onTimeShipping: SlaMetric;
  returns: SlaMetric;
}

export async function slaSummary(
  tenantId: string,
  days = 30,
  now = new Date(),
): Promise<SlaSummary> {
  const t = forTenant(db(), tenantId);
  const from = new Date(now.getTime() - days * 86_400_000);
  const window = { gte: from, lt: now };
  const [shipments, orders, returns] = await Promise.all([
    t.shipment.findMany({
      where: { receivedAt: window },
      select: { receivedAt: true, events: { where: { stage: "GUMRUK" }, select: { at: true } } },
    }),
    t.order.findMany({
      where: { shippedAt: window, status: { not: "CANCELLED" } },
      select: { orderedAt: true, shippedAt: true },
    }),
    t.returnItem.findMany({
      where: { processedAt: window },
      select: { createdAt: true, processedAt: true },
    }),
  ]);
  const inboundDays = shipments.flatMap((s) => {
    const customs = s.events.map((e) => e.at).sort((a, b) => b.getTime() - a.getTime())[0];
    return customs && s.receivedAt ? [businessDaysBetween(customs, s.receivedAt)] : [];
  });
  const onTime = orders.map((o) => (isShippedOnTime(o.orderedAt, o.shippedAt!) ? 0 : 1));
  const shipDays = orders.map((o) => businessDaysBetween(o.orderedAt, o.shippedAt!));
  const shipping = metric(onTime, 0);
  return {
    days,
    inbound: metric(inboundDays, SLA_TARGETS.inboundBusinessDays),
    onTimeShipping: {
      ...shipping,
      avgDays: metric(shipDays, Infinity).avgDays,
    },
    returns: metric(
      returns.map((r) => businessDaysBetween(r.createdAt, r.processedAt!)),
      SLA_TARGETS.returnsBusinessDays,
    ),
  };
}
