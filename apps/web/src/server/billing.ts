import {
  invoiceLines,
  invoiceTotals,
  periodRange,
  type InvoiceLine,
} from "@avrupadasat/core/billing";
import { forTenant, Prisma } from "@avrupadasat/db";
import { audit } from "./audit";
import { db } from "./db";
import { emit } from "./outbox";

/** Günlük depo anlık görüntüsü (worker her gün çalıştırır) — idempotent */
export async function snapshotStorage(day = new Date()) {
  const d = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  const tenants = await db().tenant.findMany({
    where: { status: { in: ["ACTIVE", "ONBOARDING"] } },
    select: { id: true, palletsInUse: true },
  });
  for (const t of tenants) {
    await db().storageSnapshot.upsert({
      where: { tenantId_day: { tenantId: t.id, day: d } },
      update: { pallets: t.palletsInUse },
      create: { tenantId: t.id, day: d, pallets: t.palletsInUse },
    });
  }
  return tenants.length;
}

export async function usageFor(tenantId: string, period: string) {
  const [from, to] = periodRange(period);
  const t = forTenant(db(), tenantId);
  const tenant = await db().tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const [snaps, received, shipped, prefba, returns, disb] = await Promise.all([
    t.storageSnapshot.findMany({ where: { day: { gte: from, lt: to } } }),
    t.shipment.aggregate({ where: { receivedAt: { gte: from, lt: to } }, _sum: { cartons: true } }),
    t.order.count({ where: { shippedAt: { gte: from, lt: to } } }),
    t.workOrder.aggregate({
      where: { type: "PRE_FBA", completedAt: { gte: from, lt: to } },
      _sum: { cartons: true },
    }),
    t.returnItem.count({ where: { processedAt: { gte: from, lt: to } } }),
    t.disbursement.findMany({ where: { incurredAt: { gte: from, lt: to }, invoiceId: null } }),
  ]);
  const avgPallets = snaps.length
    ? snaps.reduce((s, x) => s + x.pallets, 0) / snaps.length
    : tenant.palletsInUse;
  return {
    tenant,
    disbursementIds: disb.map((d) => d.id),
    usage: {
      packageCode: tenant.packageCode,
      avgPallets,
      inboundCartons: received._sum.cartons ?? 0,
      ordersShipped: shipped,
      preFbaCartons: prefba._sum.cartons ?? 0,
      returnsProcessed: returns,
      disbursements: disb.map((d) => ({ description: d.description, amountCents: d.amountCents })),
    },
  };
}

/** Taslak fatura üretir/yeniler (kesilmiş fatura değiştirilmez) */
export async function draftInvoice(tenantId: string, period: string, actorUserId: string) {
  const { tenant, usage } = await usageFor(tenantId, period);
  const lines = invoiceLines(usage);
  const totals = invoiceTotals(lines, tenant.vatRatePct);
  const existing = await db().invoice.findUnique({
    where: { tenantId_period: { tenantId, period } },
  });
  if (existing && existing.status !== "DRAFT") return existing;
  const data = {
    lines: lines as unknown as Prisma.InputJsonValue,
    ...totals,
    vatRatePct: tenant.vatRatePct,
  };
  const inv = existing
    ? await db().invoice.update({ where: { id: existing.id }, data })
    : await db().invoice.create({ data: { tenantId, period, ...data } });
  await audit({
    actorUserId,
    tenantId,
    action: "invoice.generated",
    entity: "Invoice",
    entityId: inv.id,
    meta: { period, draft: true },
  });
  return inv;
}

async function nextInvoiceNumber(tx: Prisma.TransactionClient) {
  const prefix = `AS-R-${new Date().getFullYear()}-`;
  const last = await tx.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
  });
  return `${prefix}${String(last ? Number(last.number!.slice(prefix.length)) + 1 : 1).padStart(5, "0")}`;
}

/** Faturayı keser: numara, vade, masrafları faturaya bağlar; sonrası değiştirilemez */
export async function issueInvoice(invoiceId: string, actorUserId: string) {
  return db().$transaction(async (tx) => {
    const inv = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    if (inv.status !== "DRAFT") throw new Error("Yalnız taslak fatura kesilebilir");
    if (inv.netCents <= 0) throw new Error("Tutarı sıfır olan fatura kesilmez");
    // Son durum: taslaktan bu yana yeni kullanım eklendiyse yeniden hesapla
    const { usage, disbursementIds, tenant } = await usageFor(inv.tenantId, inv.period);
    const lines = invoiceLines(usage);
    const totals = invoiceTotals(lines, tenant.vatRatePct);
    const issued = await tx.invoice.update({
      where: { id: inv.id },
      data: {
        number: await nextInvoiceNumber(tx),
        status: "ISSUED",
        issuedAt: new Date(),
        dueAt: new Date(Date.now() + 14 * 86_400_000),
        lines: lines as unknown as Prisma.InputJsonValue,
        ...totals,
        vatRatePct: tenant.vatRatePct,
      },
    });
    await tx.disbursement.updateMany({
      where: { id: { in: disbursementIds } },
      data: { invoiceId: inv.id },
    });
    await emit(
      tx,
      "invoice.issued.v1",
      { invoiceId: inv.id, number: issued.number!, grossCents: issued.grossCents },
      { tenantId: inv.tenantId },
    );
    await audit(
      {
        actorUserId,
        tenantId: inv.tenantId,
        action: "invoice.generated",
        entity: "Invoice",
        entityId: inv.id,
        meta: { number: issued.number },
      },
      tx,
    );
    return issued;
  });
}

export async function markPaid(invoiceId: string, actorUserId: string) {
  const inv = await db().invoice.update({
    where: { id: invoiceId, status: "ISSUED" },
    data: { status: "PAID", paidAt: new Date() },
  });
  await audit({
    actorUserId,
    tenantId: inv.tenantId,
    action: "invoice.generated",
    entity: "Invoice",
    entityId: inv.id,
    meta: { paid: true },
  });
  return inv;
}

export function linesOfInvoice(inv: { lines: unknown }): InvoiceLine[] {
  return inv.lines as InvoiceLine[];
}
