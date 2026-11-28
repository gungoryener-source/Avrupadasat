import { describe, expect, it } from "vitest";
import { code128Bars, code128Svg, code128Widths, isLabelCode, normalizeScan } from "./barcode";

describe("barkod", () => {
  it("etiket kodu biçimi", () => {
    expect(isLabelCode("DK01YAEQ")).toBe(true);
    expect(isLabelCode("DK01YAEO")).toBe(false); // O yok
    expect(isLabelCode("XK01YAEQ")).toBe(false);
    expect(isLabelCode("DK01YAE")).toBe(false);
  });

  it("okutulan değeri temizler ve karıştırılan harfleri düzeltir", () => {
    expect(normalizeScan(" dk01yaeq\r\n")).toBe("DK01YAEQ");
    expect(normalizeScan("DKO1YAEQ")).toBe("DK01YAEQ");
    expect(normalizeScan("DKI1YAEQ")).toBe("DK11YAEQ");
    expect(normalizeScan("4012345678901")).toBe("4012345678901");
  });

  it("Code 128: başlangıç B, kontrol ve bitiş desenleri", () => {
    const w = code128Widths("D1");
    // Start B (211214) + 'D' + '1' + kontrol + Stop (2331112) → 4×6 + 7 = 31 genişlik
    expect(w).toHaveLength(31);
    expect(w.slice(0, 6)).toEqual([2, 1, 1, 2, 1, 4]);
    expect(w.slice(-7)).toEqual([2, 3, 3, 1, 1, 1, 2]);
    // Her sembol 11 modül, bitiş 13 → (1+2+1)×11 + 13
    expect(w.reduce((a, b) => a + b, 0)).toBe(57);
  });

  it("8 karakterli etiket kodu 123 modül; SVG çubuk sayısı tutarlı", () => {
    const { bars, modules } = code128Bars("DK01YAEQ");
    expect(modules).toBe(123);
    expect(bars).toHaveLength(11 * 3 + 1);
    const svg = code128Svg("DK01YAEQ");
    expect(svg.match(/<rect x=/g)).toHaveLength(bars.length);
    expect(svg).toContain('viewBox="0 0 143 40"');
  });

  it("geçersiz metni reddeder", () => {
    expect(() => code128Widths("")).toThrow();
    expect(() => code128Widths("ş")).toThrow();
  });
});
