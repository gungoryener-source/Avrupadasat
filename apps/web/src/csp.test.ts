import { describe, expect, it } from "vitest";
import { buildCsp } from "./csp";

const prod = { NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv;

describe("CSP", () => {
  it("üretimde script-src yalnız self + nonce; unsafe-inline ve unsafe-eval yok", () => {
    const c = buildCsp("abc123", prod);
    const script = c.split("; ").find((d) => d.startsWith("script-src"))!;
    expect(script).toBe("script-src 'self' 'nonce-abc123'");
    expect(c).toContain("frame-ancestors 'none'");
    expect(c).toContain("object-src 'none'");
    expect(c).toContain("upgrade-insecure-requests");
  });

  it("yalnız yapılandırılan üçüncü taraflar açılır", () => {
    expect(buildCsp("n", prod)).not.toContain("googletagmanager");
    const c = buildCsp("n", {
      ...prod,
      GTM_ID: "GTM-X",
      META_PIXEL_ID: "1",
    } as unknown as NodeJS.ProcessEnv);
    expect(c).toContain("https://www.googletagmanager.com");
    expect(c).toContain("https://connect.facebook.net");
    expect(c).not.toContain("challenges.cloudflare.com");
    // 'none' başka kaynakla aynı yönergede olmamalı
    expect(c.split("; ").find((d) => d.startsWith("frame-src"))).toBe(
      "frame-src https://www.googletagmanager.com",
    );
    expect(buildCsp("n", prod)).toContain("frame-src 'none'");
  });

  it("geliştirmede eval (HMR) açık", () => {
    expect(buildCsp("n", { NODE_ENV: "development" } as unknown as NodeJS.ProcessEnv)).toContain(
      "'unsafe-eval'",
    );
  });
});
