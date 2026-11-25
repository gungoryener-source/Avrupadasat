import { forTenant } from "@avrupadasat/db";
import { audit } from "@/server/audit";
import { toCsv } from "@/server/csv";
import { db } from "@/server/db";
import { requireClient } from "@/server/session";

export async function GET() {
  const s = await requireClient("stock.read");
  const items = await forTenant(db(), s.actor.tenantId).stockItem.findMany({
    orderBy: { sku: "asc" },
  });
  await audit({
    actorUserId: s.userId,
    tenantId: s.actor.tenantId,
    action: "data.exported",
    entity: "StockItem",
    meta: { rows: items.length },
  });
  const csv = toCsv([
    ["sku", "ad", "ean", "depoda", "rezerve", "kullanilabilir"],
    ...items.map((i) => [i.sku, i.name, i.ean, i.quantity, i.reserved, i.quantity - i.reserved]),
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stok-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
