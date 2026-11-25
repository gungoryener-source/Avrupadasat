import { audit } from "@/server/audit";
import { ossCsv, ossSummary } from "@/server/exports";
import { requireClient } from "@/server/session";

export async function GET(req: Request) {
  const s = await requireClient("data.export");
  const period = new URL(req.url).searchParams.get("donem") ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
    return new Response("Geçersiz dönem", { status: 400 });
  const rows = await ossSummary(s.actor.tenantId, period);
  await audit({
    actorUserId: s.userId,
    tenantId: s.actor.tenantId,
    action: "data.exported",
    entity: "Order",
    meta: { kind: "oss", period },
  });
  return new Response(ossCsv(rows, period), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="satis-ulke-${period}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
