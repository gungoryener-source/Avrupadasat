import { describe, expect, it } from "vitest";
import { parseLabelRequest, stockScope } from "./scan";

describe("etiket isteği", () => {
  it("u ve n_ parametrelerini birleştirir, 0 adetleri atar", () => {
    const r = parseLabelRequest(
      new URLSearchParams(
        "u=cmabc12345:3&u=cmdef67890&n_cmabc12345=2&n_cmzzz00000=0&n_cmyyy11111=",
      ),
    );
    expect(r).toBeInstanceOf(Map);
    expect([...(r as Map<string, number>)]).toEqual([
      ["cmabc12345", 5],
      ["cmdef67890", 1],
    ]);
  });
  it("geçersiz değerleri reddeder", () => {
    expect(parseLabelRequest(new URLSearchParams("u=cmabc12345:501"))).toBeTypeOf("string");
    expect(parseLabelRequest(new URLSearchParams("u=cmabc12345:1.5"))).toBeTypeOf("string");
    expect(parseLabelRequest(new URLSearchParams("u=../x:1"))).toBeTypeOf("string");
    expect(parseLabelRequest(new URLSearchParams(""))).toBeTypeOf("string");
  });
});

describe("okutma kapsamı", () => {
  it("rol bazlı", () => {
    expect(stockScope({ userId: "u", role: "CLIENT_OWNER", tenantId: "t1" })).toEqual({
      tenantId: "t1",
    });
    expect(stockScope({ userId: "u", role: "ADMIN", tenantId: null })).toEqual({});
    expect(
      stockScope({ userId: "u", role: "PARTNER", tenantId: null, partnerTenantIds: ["a"] }),
    ).toEqual({ tenantId: { in: ["a"] } });
    expect(stockScope({ userId: "u", role: "CLIENT_USER", tenantId: null })).toBeNull();
  });
});
