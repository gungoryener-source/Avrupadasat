import { canAccessTenant } from "@avrupadasat/core/roles";
import { db } from "@/server/db";
import { currentSession } from "@/server/session";
import { readProductImage } from "@/server/stock";

export const runtime = "nodejs";

/** Ürün görseli: oturum + 2FA + firma erişimi. Public dizinde tutulmaz. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await currentSession();
  if (!s?.actor || !s.twoFactorPassed) return new Response("Oturum gerekli", { status: 401 });
  const item = await db().stockItem.findUnique({ where: { id }, select: { tenantId: true } });
  if (!item || !canAccessTenant(s.actor, item.tenantId))
    return new Response("Bulunamadı", { status: 404 });
  const img = await readProductImage(item.tenantId, id);
  if (!img) return new Response("Bulunamadı", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.type,
      "Content-Length": String(img.data.length),
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
