import { forTenant } from "@avrupadasat/db";
import { apiActor, json } from "@/server/api-auth";
import { db } from "@/server/db";
import { missingDocs } from "@/server/documents";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const a = await apiActor(req);
  if (!a) return json({ error: "Yetkisiz" }, 401);
  const { id } = await params;
  const s = await forTenant(db(), a.tenantId).shipment.findFirst({
    where: { id },
    include: {
      events: { orderBy: { at: "asc" }, select: { stage: true, at: true, note: true } },
      lines: { select: { sku: true, quantity: true, receivedQty: true, damagedQty: true } },
      documents: { select: { kind: true } },
    },
  });
  if (!s) return json({ error: "Bulunamadı" }, 404);
  const { documents, ...rest } = s;
  return json({ ...rest, missingDocs: missingDocs(documents.map((d) => d.kind)) });
}
