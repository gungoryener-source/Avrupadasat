import { describe, expect, it } from "vitest";
import { ApiError, createApi, eur, trDate } from "./api";

function fakeFetch(
  handler: (url: string, init: RequestInit) => { status: number; body?: unknown },
) {
  const calls: { url: string; init: RequestInit }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = handler(url, init);
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status });
  }) as unknown as typeof fetch;
  return { f, calls };
}

describe("mobil API istemcisi", () => {
  it("HTTPS olmayan uzak adresi reddeder (yerel geliştirme hariç)", () => {
    expect(() => createApi("http://avrupadasat.com", () => null)).toThrow();
    expect(() => createApi("http://10.0.2.2:3000", () => null)).not.toThrow();
  });

  it("token'ı Bearer başlığıyla gönderir, hatayı ApiError olarak döner", async () => {
    const { f, calls } = fakeFetch((url) =>
      url.endsWith("/me")
        ? { status: 401, body: { error: "Yetkisiz" } }
        : { status: 200, body: { items: [] } },
    );
    const api = createApi("https://x.test/", () => "as_tok", f);
    await expect(api.stock()).resolves.toEqual([]);
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe("Bearer as_tok");
    expect(calls[0]!.url).toBe("https://x.test/api/v1/stock");
    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
  });

  it("giriş: 2FA kodu boşsa gönderilmez", async () => {
    const { f, calls } = fakeFetch(() => ({
      status: 200,
      body: { token: "as_x", expiresAt: "2026-12-25" },
    }));
    await createApi("https://x.test", () => null, f).login("a@b.co", "pw", "");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ email: "a@b.co", password: "pw" });
  });

  it("biçimler", () => {
    expect(eur(129990)).toBe("€1299,90");
    expect(trDate("2026-11-25T10:00:00Z")).toBe("25.11.2026");
    expect(trDate(null)).toBe("—");
  });
});
