import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { ktunMonthlyReport, ktunReportCsv } from "@/server/ktun-report";
import { requireStaff } from "@/server/session";

/** Ekip: firma seçerek KTÜN bazlı aylık rapor */
export async function GET(req: Request) {
  const s = await requireStaff("data.export");
  const q = new URL(req.url).searchParams;
  const period = q.get("donem") ?? "";
  const tenantId = q.get("firma") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
    return new Response("Geçersiz dönem", { status: 400 });
  const tenant = await db().tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) return new Response("Firma bulunamadı", { status: 404 });
  const r = await ktunMonthlyReport(tenant.id, period);
  await audit({
    actorUserId: s.userId,
    tenantId: tenant.id,
    action: "data.exported",
    entity: "StockMovement",
    meta: { kind: "ktun", period, rows: r.rows.length },
  });
  return new Response(ktunReportCsv(r), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ktun-raporu-${period}-${tenant.id}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
