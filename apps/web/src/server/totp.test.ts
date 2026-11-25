import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, hotp, matchTotpStep, totp, verifyTotp } from "./totp";
import { passwordProblem } from "./password";
import { slugify } from "./slug";

// RFC 4226 / 6238 test sırrı
const SECRET = Buffer.from("12345678901234567890");
const B32 = base32Encode(SECRET);

describe("TOTP", () => {
  it("base32 gidiş-dönüş", () => {
    expect(B32).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(base32Decode(B32).equals(SECRET)).toBe(true);
  });

  it("RFC 4226 HOTP vektörleri", () => {
    expect(["755224", "287082", "359152"]).toEqual([0, 1, 2].map((c) => hotp(SECRET, c)));
  });

  it("RFC 6238 TOTP vektörleri (8 hane)", () => {
    expect(totp(B32, 59_000, 30, 8)).toBe("94287082");
    expect(totp(B32, 1_111_111_109_000, 30, 8)).toBe("07081804");
  });

  it("±30 sn kaymayı kabul eder, ötesini reddeder", () => {
    const now = 1_700_000_000_000;
    const code = totp(B32, now);
    expect(verifyTotp(B32, code, now + 30_000)).toBe(true);
    expect(verifyTotp(B32, code, now + 95_000)).toBe(false);
    expect(verifyTotp(B32, "12345", now)).toBe(false);
  });
});

describe("TOTP adımı", () => {
  it("kullanılmış adım ve öncesi reddedilir", () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 30_000);
    const code = totp(B32, now);
    expect(matchTotpStep(B32, code, now)).toBe(step);
    expect(matchTotpStep(B32, code, now, step)).toBeNull();
    expect(matchTotpStep(B32, totp(B32, now + 30_000), now + 30_000, step)).toBe(step + 1);
  });
});

describe("şifre kuralı", () => {
  it("kısa ve rakamsız şifreleri reddeder", () => {
    expect(passwordProblem("kisa1")).not.toBeNull();
    expect(passwordProblem("sadecetanesiharf")).not.toBeNull();
    expect(passwordProblem("Avrupa'da satış 2026")).toBeNull();
  });
});

describe("slug", () => {
  it("Türkçe karakterleri dönüştürür", () => {
    expect(slugify("Yıldız Mobilya Ş.T.İ. Çağ")).toBe("yildiz-mobilya-s-t-i-cag");
  });
});
