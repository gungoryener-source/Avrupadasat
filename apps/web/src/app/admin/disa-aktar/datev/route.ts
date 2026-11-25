import { audit } from "@/server/audit";
import { datevCsv } from "@/server/exports";
import { requireStaff } from "@/server/session";

export async function GET(req: Request) {
  const s = await requireStaff("data.export");
  const period = new URL(req.url).searchParams.get("donem") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))
    return new Response("Geçersiz dönem", { status: 400 });
  const { csv, rows } = await datevCsv(period);
  await audit({
    actorUserId: s.userId,
    action: "data.exported",
    entity: "Invoice",
    meta: { kind: "datev", period, rows },
  });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="datev-${period}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
