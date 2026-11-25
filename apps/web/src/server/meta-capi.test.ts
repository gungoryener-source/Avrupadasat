import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildCapiPayload, sendCapiLead } from "./meta-capi";

describe("Meta CAPI", () => {
  it("e-posta ve telefonu normalize edip SHA-256 ile hash'ler, ham veri göndermez", () => {
    const p = buildCapiPayload(
      {
        eventId: "e1",
        email: " Ali@Firma.COM ",
        phone: "+90 (532) 000-0000",
        sourceUrl: "https://x/",
        ip: null,
      },
      1_700_000_000_000,
    );
    const s = JSON.stringify(p);
    expect(s).not.toContain("ali@firma.com");
    expect(s).not.toContain("532");
    expect(p.data[0]!.user_data.em[0]).toBe(
      createHash("sha256").update("ali@firma.com").digest("hex"),
    );
    expect(p.data[0]!.user_data.ph[0]).toBe(
      createHash("sha256").update("905320000000").digest("hex"),
    );
    expect(p.data[0]).toMatchObject({
      event_name: "Lead",
      event_id: "e1",
      event_time: 1_700_000_000,
    });
  });

  it("anahtar yoksa istek atmaz", async () => {
    delete process.env.META_CAPI_TOKEN;
    expect(
      await sendCapiLead({ eventId: "e", email: "a@b.c", phone: "1", sourceUrl: "", ip: null }),
    ).toBe("mock");
  });
});
