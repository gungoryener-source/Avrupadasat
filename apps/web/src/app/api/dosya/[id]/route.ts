import { canAccessTenant } from "@avrupadasat/core/roles";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { verifyDownload } from "@/server/files";
import { clientIp, currentSession } from "@/server/session";
import { getObject } from "@/server/storage";

export const runtime = "nodejs";

/**
 * Belge indirme: (1) süreli HMAC imza, (2) geçerli oturum + 2FA, (3) firma erişim kontrolü.
 * Dosya her zaman "attachment" olarak ve tespit edilen MIME ile verilir.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const s = await currentSession();
  if (!s?.actor || !s.twoFactorPassed) return new Response("Oturum gerekli", { status: 401 });
  if (!verifyDownload(id, s.userId, url.searchParams.get("e"), url.searchParams.get("s"))) {
    return new Response("Bağlantının süresi dolmuş; sayfayı yenileyin", { status: 403 });
  }
  const doc = await db().document.findUnique({ where: { id } });
  if (!doc || !canAccessTenant(s.actor, doc.tenantId))
    return new Response("Bulunamadı", { status: 404 });
  if (doc.scanStatus === "infected") return new Response("Engellendi", { status: 403 });
  const data = await getObject(doc.storageKey);
  await audit({
    actorUserId: s.userId,
    tenantId: doc.tenantId,
    action: "document.downloaded",
    entity: "Document",
    entityId: doc.id,
    ip: await clientIp(),
  });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Length": String(data.length),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
