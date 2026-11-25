import { describe, expect, it } from "vitest";
import { evaluate } from "./wizard";

const base = {
  category: "tekstil",
  electric: false,
  battery: false,
  foodContact: false,
  buyers: "B2C",
  stockInGermany: true,
} as const;
const ids = (a: Parameters<typeof evaluate>[0]) => evaluate(a).map((i) => i.id);

describe("uygunluk sihirbazı", () => {
  it("tüketiciye tekstil: ambalaj, ürün güvenliği, KDV, lif etiketi", () => {
    expect(ids(base)).toEqual(expect.arrayContaining(["lucid", "gpsr", "vat", "eori", "textile"]));
    expect(ids(base)).not.toContain("weee");
  });

  it("elektrikli ve pilli ürün: CE, WEEE, pil kaydı", () => {
    expect(ids({ ...base, category: "elektronik", battery: true })).toEqual(
      expect.arrayContaining(["ce", "weee", "batt"]),
    );
  });

  it("yalnız B2B ve Almanya'da stok yok: tüketici yükümlülükleri ve KDV çıkmaz", () => {
    const r = ids({ ...base, buyers: "B2B", stockInGermany: false });
    expect(r).not.toContain("lucid");
    expect(r).not.toContain("vat");
    expect(r).toContain("customs");
  });

  it("gıda: etiket ve kayıt", () => {
    expect(ids({ ...base, category: "gida" })).toEqual(
      expect.arrayContaining(["food-label", "food-reg"]),
    );
  });
});
