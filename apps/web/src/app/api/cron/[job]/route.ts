import { snapshotStorage } from "@/server/billing";
import { db } from "@/server/db";
import { syncOrders } from "@/server/orders";
import { runReminders } from "@/server/reminders";
import { safeEqual } from "@/server/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Zamanlanmış işler (worker veya platform cron'u çağırır). CRON_SECRET ile korunur. */
export async function POST(req: Request, { params }: { params: Promise<{ job: string }> }) {
  const secret = process.env.CRON_SECRET ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (secret.length < 32 || !safeEqual(auth, `Bearer ${secret}`))
    return new Response("Yetkisiz", { status: 401 });
  const { job } = await params;
  if (job === "hatirlatmalar") return Response.json(await runReminders());
  if (job === "snapshot") return Response.json({ tenants: await snapshotStorage() });
  if (job === "sync") {
    const conns = await db().marketplaceConnection.findMany({ where: { status: "ACTIVE" } });
    const results = [];
    for (const c of conns)
      results.push({
        tenantId: c.tenantId,
        channel: c.channel,
        ...(await syncOrders(c.tenantId, c.channel)),
      });
    return Response.json({ results });
  }
  return new Response("Bilinmeyen iş", { status: 404 });
}
