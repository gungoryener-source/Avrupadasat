import { forTenant } from "@avrupadasat/db";
import { db } from "./db";
import { missingDocs } from "./documents";

/** Satış ve ödeme adımlarının açılması için gereken kayıtlar */
export const SALES_UNLOCK_STEPS = ["VERGI_NO", "UST_ID"] as const;

export async function registrationState(tenantId: string) {
  const t = forTenant(db(), tenantId);
  const tasks = await t.registrationTask.findMany({ orderBy: { step: "asc" } });
  const pendingUnlock = tasks.filter(
    (x) => (SALES_UNLOCK_STEPS as readonly string[]).includes(x.step) && x.status !== "TAMAM",
  );
  return { tasks, salesLocked: pendingUnlock.length > 0, pendingUnlock };
}

/** "Numara beklerken hazırlayabilecekleriniz" — durum veriden türetilir */
export async function waitingList(tenantId: string) {
  const t = forTenant(db(), tenantId);
  const [items, approved, shipments, docs, users] = await Promise.all([
    t.stockItem.count(),
    t.stockItem.count({ where: { contentApprovedAt: { not: null } } }),
    t.shipment.count(),
    t.document.count({ where: { kind: { in: ["CE_BEYAN", "SIRKET"] } } }),
    t.membership.count(),
  ]);
  return [
    {
      id: "catalog",
      title: "Ürün kartlarınızı yükleyin (SKU, ad, EAN)",
      done: items > 0,
      href: "/panel/stok",
    },
    {
      id: "content",
      title: "Almanca ürün içeriklerini onaylayın",
      done: items > 0 && approved === items,
      href: "/panel/stok",
    },
    {
      id: "docs",
      title: "Ürün belgelerini yükleyin (CE beyanı, test raporları)",
      done: docs > 0,
      href: "/panel/belgeler",
    },
    {
      id: "asn",
      title: "İlk sevkiyatınızı bildirin (ASN)",
      done: shipments > 0,
      href: "/panel/sevkiyatlar",
    },
    {
      id: "team",
      title: "Ekibinizi panele davet edin",
      done: users > 1,
      href: "/panel/kullanicilar",
    },
  ];
}

export async function overview(tenantId: string) {
  const t = forTenant(db(), tenantId);
  const [stock, activeShipments, shipments, reg, lowStock] = await Promise.all([
    t.stockItem.aggregate({ _sum: { quantity: true }, _count: true }),
    t.shipment.count({ where: { stage: { not: "DEPO_KABUL" } } }),
    t.shipment.findMany({
      where: { stage: { not: "DEPO_KABUL" } },
      include: { documents: { select: { kind: true } } },
      take: 50,
    }),
    registrationState(tenantId),
    t.stockItem.findMany({
      where: { quantity: { lt: 10 } },
      take: 5,
      orderBy: { quantity: "asc" },
    }),
  ]);
  const missing = shipments
    .map((s) => ({
      id: s.id,
      reference: s.reference,
      missing: missingDocs(s.documents.map((d) => d.kind)),
    }))
    .filter((x) => x.missing.length > 0);
  return {
    units: stock._sum.quantity ?? 0,
    skus: stock._count,
    activeShipments,
    pendingSteps: reg.tasks.filter((x) => x.status !== "TAMAM").length,
    salesLocked: reg.salesLocked,
    missingDocs: missing,
    lowStock,
  };
}
