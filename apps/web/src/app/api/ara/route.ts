import { STAFF_ROLES } from "@avrupadasat/core/roles";
import { forTenant } from "@avrupadasat/db";
import { db } from "@/server/db";
import { currentSession } from "@/server/session";

export const runtime = "nodejs";

type Hit = {
  kind: "order" | "product" | "tenant" | "ticket";
  title: string;
  sub?: string;
  href: string;
};

/**
 * Komut paleti araması. Oturum + 2FA zorunlu; müşteri yalnız kendi firmasında arar,
 * ekip (PARTNER hariç tüm firmalar; PARTNER yalnız atandıkları) firma/sipariş arar.
 */
export async function GET(req: Request) {
  const s = await currentSession();
  if (!s?.actor || !s.twoFactorPassed) return Response.json({ hits: [] }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return Response.json({ hits: [] });
  const like = { contains: q, mode: "insensitive" as const };
  const hits: Hit[] = [];
  const a = s.actor;
  if (a.tenantId && !STAFF_ROLES.includes(a.role)) {
    const t = forTenant(db(), a.tenantId);
    const [orders, items, tickets] = await Promise.all([
      t.order.findMany({
        where: { externalId: like },
        select: { id: true, externalId: true, channel: true, status: true },
        take: 5,
        orderBy: { orderedAt: "desc" },
      }),
      t.stockItem.findMany({
        where: { OR: [{ sku: like }, { name: like }, { ean: like }] },
        select: { id: true, sku: true, name: true },
        take: 5,
      }),
      t.ticket.findMany({
        where: { subject: like },
        select: { id: true, number: true, subject: true },
        take: 3,
      }),
    ]);
    for (const o of orders)
      hits.push({
        kind: "order",
        title: o.externalId,
        sub: o.channel,
        href: `/panel?siparis=${o.id}`,
      });
    for (const i of items)
      hits.push({ kind: "product", title: i.name, sub: i.sku, href: `/panel/stok/urun/${i.id}` });
    for (const k of tickets)
      hits.push({
        kind: "ticket",
        title: `#${k.number} ${k.subject}`,
        href: `/panel/destek/${k.id}`,
      });
  } else {
    const scope = a.role === "PARTNER" ? { id: { in: [...(a.partnerTenantIds ?? [])] } } : {};
    const tScope =
      a.role === "PARTNER" ? { tenantId: { in: [...(a.partnerTenantIds ?? [])] } } : {};
    const [tenants, orders] = await Promise.all([
      db().tenant.findMany({
        where: { ...scope, OR: [{ name: like }, { legalName: like }] },
        select: { id: true, name: true, city: true },
        take: 5,
      }),
      db().order.findMany({
        where: { ...tScope, externalId: like },
        select: { externalId: true, tenantId: true, tenant: { select: { name: true } } },
        take: 5,
      }),
    ]);
    for (const t of tenants)
      hits.push({
        kind: "tenant",
        title: t.name,
        sub: t.city ?? undefined,
        href: `/admin/musteriler/${t.id}`,
      });
    for (const o of orders)
      hits.push({
        kind: "order",
        title: o.externalId,
        sub: o.tenant.name,
        href: `/admin/musteriler/${o.tenantId}?sekme=siparisler&q=${encodeURIComponent(o.externalId)}`,
      });
  }
  return Response.json({ hits }, { headers: { "Cache-Control": "private, no-store" } });
}
