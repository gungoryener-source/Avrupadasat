import { can, canAccessTenant } from "@avrupadasat/core/roles";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { MAX_LABELS, labelsPdf, type LabelFormat } from "@/server/label-pdf";
import { parseLabelRequest } from "@/server/scan";
import { currentSession } from "@/server/session";

export const runtime = "nodejs";

/**
 * Ürün etiketleri (PDF). ?bicim=termal|a4 ve u=<id>:<adet> veya n_<id>=<adet>.
 * Oturum + 2FA + stok okuma yetkisi; her ürünün firmasına erişim ayrıca denetlenir.
 */
export async function GET(req: Request) {
  const s = await currentSession();
  if (!s?.actor || !s.twoFactorPassed) return new Response("Oturum gerekli", { status: 401 });
  if (!can(s.actor.role, "stock.read")) return new Response("Yetki yok", { status: 403 });
  const params = new URL(req.url).searchParams;
  const format: LabelFormat = params.get("bicim") === "a4" ? "a4" : "termal";
  const want = parseLabelRequest(params);
  if (typeof want === "string") return new Response(want, { status: 400 });
  const total = [...want.values()].reduce((a, b) => a + b, 0);
  if (total > MAX_LABELS)
    return new Response(`Tek seferde en fazla ${MAX_LABELS} etiket`, { status: 400 });
  const items = await db().stockItem.findMany({
    where: { id: { in: [...want.keys()] } },
    select: { id: true, tenantId: true, labelCode: true, name: true, sku: true },
  });
  if (items.length !== want.size || items.some((i) => !canAccessTenant(s.actor!, i.tenantId)))
    return new Response("Bulunamadı", { status: 404 });
  const byId = new Map(items.map((i) => [i.id, i]));
  const pdf = await labelsPdf(
    [...want].map(([id, count]) => {
      const i = byId.get(id)!;
      return { item: { code: i.labelCode, name: i.name, sku: i.sku }, count };
    }),
    format,
  );
  const tenants = [...new Set(items.map((i) => i.tenantId))];
  for (const tenantId of tenants)
    await audit({
      actorUserId: s.userId,
      tenantId,
      action: "labels.printed",
      entity: "StockItem",
      meta: {
        format,
        labels: items
          .filter((i) => i.tenantId === tenantId)
          .reduce((a, i) => a + (want.get(i.id) ?? 0), 0),
      },
    });
  const name = items.length === 1 ? items[0]!.sku.replace(/[^\w.-]/g, "_") : "urunler";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="etiket-${name}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
