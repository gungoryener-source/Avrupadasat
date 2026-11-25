import { apiActor, json } from "@/server/api-auth";
import { overview, waitingList } from "@/server/panel";

export async function GET(req: Request) {
  const a = await apiActor(req);
  if (!a) return json({ error: "Yetkisiz" }, 401);
  const [o, waiting] = await Promise.all([overview(a.tenantId), waitingList(a.tenantId)]);
  return json({
    ...o,
    lowStock: o.lowStock.map((i) => ({ sku: i.sku, name: i.name, quantity: i.quantity })),
    waiting,
  });
}
