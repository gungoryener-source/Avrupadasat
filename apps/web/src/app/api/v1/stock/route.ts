import { forTenant } from "@avrupadasat/db";
import { apiActor, json } from "@/server/api-auth";
import { db } from "@/server/db";

export async function GET(req: Request) {
  const a = await apiActor(req);
  if (!a) return json({ error: "Yetkisiz" }, 401);
  const items = await forTenant(db(), a.tenantId).stockItem.findMany({
    orderBy: { sku: "asc" },
    take: 1000,
    select: { sku: true, name: true, quantity: true, reserved: true },
  });
  return json({ items: items.map((i) => ({ ...i, available: i.quantity - i.reserved })) });
}
