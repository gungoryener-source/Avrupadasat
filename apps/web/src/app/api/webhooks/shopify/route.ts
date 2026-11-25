import { after } from "next/server";
import { decryptField } from "@avrupadasat/db/crypto";
import { db } from "@/server/db";
import { syncOrders } from "@/server/orders";
import { SHOP_DOMAIN_RE, verifyShopifyWebhook } from "@/server/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYNC_TOPICS = new Set(["orders/create", "orders/paid", "orders/updated"]);

/**
 * Shopify webhook: imza, mağazanın kendi uygulama gizli anahtarıyla doğrulanır (şifreli saklanır).
 * Gövde işlenmez/saklanmaz; yalnızca o firmanın sipariş senkronunu tetikler (idempotent).
 * Bilinmeyen mağaza ile bozuk imza aynı yanıtı alır (401) — mağaza varlığı sızdırılmaz.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 1_000_000) return new Response("Çok büyük", { status: 413 });
  const shop = (req.headers.get("x-shopify-shop-domain") ?? "").toLowerCase();
  const topic = req.headers.get("x-shopify-topic") ?? "";
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const deny = () => new Response("Yetkisiz", { status: 401 });
  if (!SHOP_DOMAIN_RE.test(shop)) return deny();
  const conn = await db().marketplaceConnection.findFirst({
    where: { channel: "WEBSHOP", externalAccount: shop, mode: "live", status: "ACTIVE" },
  });
  if (!conn?.credentialsEnc) return deny();
  const secret = (JSON.parse(decryptField(conn.credentialsEnc)) as { webhookSecret?: string })
    .webhookSecret;
  if (!secret || !verifyShopifyWebhook(raw, hmac, secret)) return deny();
  // Shopify 5 sn içinde 2xx bekler: senkron yanıttan sonra çalışır; başarısızsa cron yeniden dener
  if (SYNC_TOPICS.has(topic))
    after(() => syncOrders(conn.tenantId, "WEBSHOP").then(() => undefined));
  return new Response(null, { status: 200 });
}
