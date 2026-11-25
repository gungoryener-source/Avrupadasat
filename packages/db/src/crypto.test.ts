import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptField, encryptField, maskTail } from "./crypto";

const key = randomBytes(32).toString("base64");

describe("alan şifreleme", () => {
  it("şifreler ve çözer; aynı metin her seferinde farklı çıktı verir", () => {
    const a = encryptField("DE89370400440532013000", key);
    const b = encryptField("DE89370400440532013000", key);
    expect(a).not.toBe(b);
    expect(a).not.toContain("DE8937");
    expect(decryptField(a, key)).toBe("DE89370400440532013000");
  });

  it("değiştirilmiş veriyi reddeder", () => {
    const t = encryptField("1234567890", key).split(".");
    t[3] = Buffer.from("xxxxxxxxxx").toString("base64url");
    expect(() => decryptField(t.join("."), key)).toThrow();
  });

  it("yanlış anahtarla çözülemez", () => {
    const t = encryptField("1234567890", key);
    expect(() => decryptField(t, randomBytes(32).toString("base64"))).toThrow();
  });

  it("maskeler", () => {
    expect(maskTail("DE89 3704 0044")).toBe("••••••••0044");
  });
});
