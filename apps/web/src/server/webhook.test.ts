import { createHmac } from "node:crypto";
import { encryptField } from "@avrupadasat/db/crypto";
import { afterAll, describe, expect, it } from "vitest";
import { POST } from "../app/api/webhooks/shopify/route";
import { db } from "./db";

const shop = `wh${Date.now()}.myshopify.com`;
let T: string;

const req = (body: string, headers: Record<string, string>) =>
  new Request("http://localhost/api/webhooks/shopify", { method: "POST", body, headers });

describe.skipIf(!process.env.DATABASE_URL)("Shopify webhook ucu", () => {
  afterAll(async () => {
    if (T) await db().tenant.delete({ where: { id: T } });
  });

  it("imza firmanın kendi anahtarıyla doğrulanır; bilinmeyen mağaza ve bozuk imza aynı yanıtı alır", async () => {
    T = (
      await db().tenant.create({
        data: { name: "Wh", slug: shop.split(".")[0]!, status: "ACTIVE" },
      })
    ).id;
    await db().marketplaceConnection.create({
      data: {
        tenantId: T,
        channel: "WEBSHOP",
        mode: "live",
        externalAccount: shop,
        credentialsEnc: encryptField(
          JSON.stringify({
            shop,
            accessToken: "shpat_x",
            locationId: "gid://shopify/Location/1",
            webhookSecret: "whsec_test",
          }),
        ),
      },
    });
    const body = '{"id":123}';
    const sig = createHmac("sha256", "whsec_test").update(body).digest("base64");
    const h = {
      "x-shopify-shop-domain": shop,
      "x-shopify-topic": "app/uninstalled",
      "x-shopify-hmac-sha256": sig,
    };
    expect((await POST(req(body, h))).status).toBe(200);
    expect((await POST(req(body + "x", h))).status).toBe(401);
    expect(
      (
        await POST(
          req(body, {
            ...h,
            "x-shopify-hmac-sha256": createHmac("sha256", "baska").update(body).digest("base64"),
          }),
        )
      ).status,
    ).toBe(401);
    expect(
      (await POST(req(body, { ...h, "x-shopify-shop-domain": "yok.myshopify.com" }))).status,
    ).toBe(401);
    expect((await POST(req(body, { ...h, "x-shopify-shop-domain": "evil.com" }))).status).toBe(401);
  });
});
