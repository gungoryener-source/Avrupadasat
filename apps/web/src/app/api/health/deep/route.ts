import { timingSafeEqual } from "node:crypto";
import { deepHealth } from "@/server/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(req: Request): boolean {
  const secret = process.env.HEALTH_TOKEN || process.env.CRON_SECRET;
  const m = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "");
  if (!secret || !m) return false;
  const a = Buffer.from(m[1]!);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** İzleme servisi için: ok/warn → 200, down → 503. Yetkisiz istek ayrıntı görmez. */
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Yetkisiz", { status: 401 });
  const r = await deepHealth();
  return Response.json(r, {
    status: r.status === "down" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
