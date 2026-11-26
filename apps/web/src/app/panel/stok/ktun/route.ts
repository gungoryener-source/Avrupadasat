import { audit } from "@/server/audit";
import { ktunMonthlyReport, ktunReportCsv } from "@/server/ktun-report";
import { requireClient } from "@/server/session";

/** Firma: KTÜN bazlı aylık sipariş karşılama raporu (e-ihracat destek başvurusu için) */
export async function GET(req: Request) {
  const s = await requireClient("stock.read");
  const period = new URL(req.url).searchParams.get("donem") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
    return new Response("Geçersiz dönem", { status: 400 });
  const r = await ktunMonthlyReport(s.actor.tenantId, period);
  await audit({
    actorUserId: s.userId,
    tenantId: s.actor.tenantId,
    action: "data.exported",
    entity: "StockMovement",
    meta: { kind: "ktun", period, rows: r.rows.length },
  });
  return new Response(ktunReportCsv(r), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ktun-raporu-${period}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
