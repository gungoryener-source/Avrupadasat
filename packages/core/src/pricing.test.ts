import { describe, expect, it } from "vitest";
import { estimateMonthly, formatEur, pickPackRate } from "./pricing";

const base = { skus: 40, marketplace: true, customerService: false, accounting: false };

describe("pick & pack kademeleri", () => {
  it("hacme göre düşer", () => {
    expect(pickPackRate(300)).toBe(210);
    expect(pickPackRate(801)).toBe(185);
    expect(pickPackRate(2500)).toBe(160);
    expect(pickPackRate(0)).toBe(210);
  });
});

describe("aylık tahmin (sitedeki hesaplayıcı ile aynı)", () => {
  it("10 palet, 600 sipariş, pazaryeri açık", () => {
    const e = estimateMonthly({ ...base, pallets: 10, ordersPerMonth: 600 });
    expect(e.storage).toBe(13_000);
    expect(e.pickPack).toBe(126_000);
    expect(e.subscription).toBe(49_900);
    expect(e.extras).toBe(1_600);
    expect(e.total).toBe(190_500);
  });

  it("pazaryeri kapalıysa Operasyon aboneliği", () => {
    expect(
      estimateMonthly({ ...base, marketplace: false, pallets: 5, ordersPerMonth: 100 })
        .subscription,
    ).toBe(34_900);
  });

  it("31 palet ve üstü büyük hacim aboneliği", () => {
    expect(estimateMonthly({ ...base, pallets: 30, ordersPerMonth: 100 }).subscription).toBe(
      49_900,
    );
    expect(estimateMonthly({ ...base, pallets: 31, ordersPerMonth: 100 }).subscription).toBe(
      79_900,
    );
  });

  it("sipariş yoksa sipariş başı 0", () => {
    expect(estimateMonthly({ ...base, pallets: 1, ordersPerMonth: 0 }).perOrder).toBe(0);
  });

  it("negatif değer reddedilir", () => {
    expect(() => estimateMonthly({ ...base, pallets: -1, ordersPerMonth: 1 })).toThrow(RangeError);
  });
});

describe("biçim", () => {
  it("simge önde, Alman sayı biçimi", () => {
    expect(formatEur(190_500)).toBe("€1.905");
    expect(formatEur(195, { decimals: true })).toBe("€1,95");
    expect(formatEur(-5_000)).toBe("-€50");
  });
});
