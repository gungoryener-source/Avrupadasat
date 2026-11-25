import { forTenant } from "@avrupadasat/db";
import { apiActor, json } from "@/server/api-auth";
import { db } from "@/server/db";

/** Alıcı adresi (kişisel veri) mobil API'de dönmez; yalnız şehir */
export async function GET(req: Request) {
  const a = await apiActor(req);
  if (!a) return json({ error: "Yetkisiz" }, 401);
  const rows = await forTenant(db(), a.tenantId).order.findMany({
    orderBy: { orderedAt: "desc" },
    take: 100,
    select: {
      id: true,
      channel: true,
      externalId: true,
      status: true,
      itemsCents: true,
      carrier: true,
      trackingNo: true,
      orderedAt: true,
      shippedAt: true,
      country: true,
    },
  });
  return json({ orders: rows });
}
