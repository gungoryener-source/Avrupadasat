import { can } from "@avrupadasat/core/roles";
import { lookupScan } from "@/server/scan";
import { currentSession } from "@/server/session";

export const runtime = "nodejs";

/** Barkod okutma: etiket kodu, EAN veya SKU ile ürün bulur (rol bazlı kapsam) */
export async function GET(req: Request) {
  const s = await currentSession();
  if (!s?.actor || !s.twoFactorPassed)
    return Response.json({ error: "Oturum gerekli" }, { status: 401 });
  if (!can(s.actor.role, "stock.read"))
    return Response.json({ error: "Yetki yok" }, { status: 403 });
  const kod = new URL(req.url).searchParams.get("kod") ?? "";
  if (!kod.trim() || kod.length > 128)
    return Response.json({ error: "Kod gerekli" }, { status: 400 });
  return Response.json(await lookupScan(s.actor, kod), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
