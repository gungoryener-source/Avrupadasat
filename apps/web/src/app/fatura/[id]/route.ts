import { canAccessTenant } from "@avrupadasat/core/roles";
import { can } from "@avrupadasat/core/roles";
import { db } from "@/server/db";
import { invoicePdf } from "@/server/pdf";
import { linesOfInvoice } from "@/server/billing";
import { currentSession } from "@/server/session";

export const runtime = "nodejs";

/** Fatura PDF'i: müşteri kendi faturasını, finans ekibi tüm faturaları indirir */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await currentSession();
  if (!s?.actor || !s.twoFactorPassed || !can(s.actor.role, "invoice.read"))
    return new Response("Yetkisiz", { status: 401 });
  const { id } = await params;
  const inv = await db().invoice.findUnique({ where: { id }, include: { tenant: true } });
  if (!inv || !canAccessTenant(s.actor, inv.tenantId) || !inv.number || !inv.issuedAt)
    return new Response("Bulunamadı", { status: 404 });
  const bytes = await invoicePdf({
    number: inv.number,
    period: inv.period,
    issuedAt: inv.issuedAt,
    dueAt: inv.dueAt,
    customer: inv.tenant.name,
    lines: linesOfInvoice(inv),
    netCents: inv.netCents,
    vatRatePct: inv.vatRatePct,
    vatCents: inv.vatCents,
    grossCents: inv.grossCents,
  });
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${inv.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
