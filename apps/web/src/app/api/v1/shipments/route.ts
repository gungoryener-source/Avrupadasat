import { forTenant } from "@avrupadasat/db";
import { apiActor, json } from "@/server/api-auth";
import { db } from "@/server/db";

export async function GET(req: Request) {
  const a = await apiActor(req);
  if (!a) return json({ error: "Yetkisiz" }, 401);
  const rows = await forTenant(db(), a.tenantId).shipment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      reference: true,
      stage: true,
      pallets: true,
      cartons: true,
      expectedAt: true,
      receivedAt: true,
      createdAt: true,
    },
  });
  return json({ shipments: rows });
}
