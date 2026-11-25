import { describe, expect, it } from "vitest";
import { createApi, screenFromNotification } from "./api";

describe("anlık bildirim", () => {
  it("anahtarı PUT /api/v1/push ile gönderir", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const f = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;
    await createApi("https://x.test", () => "as_t", f).registerPush(
      "ExponentPushToken[abcdefghijkl]",
    );
    expect(calls[0]!.url).toBe("https://x.test/api/v1/push");
    expect(calls[0]!.init.method).toBe("PUT");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({
      token: "ExponentPushToken[abcdefghijkl]",
    });
  });

  it("bildirimdeki ekran adı yalnız bilinen sekmelerden biriyse kabul edilir", () => {
    expect(screenFromNotification({ screen: "shipments" })).toBe("shipments");
    expect(screenFromNotification({ screen: "admin" })).toBeNull();
    expect(screenFromNotification(null)).toBeNull();
    expect(screenFromNotification({ screen: 1 })).toBeNull();
  });
});
