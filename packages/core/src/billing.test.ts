import { describe, expect, it } from "vitest";
import { invoiceLines, invoiceTotals, periodRange } from "./billing";

describe("aylık fatura", () => {
  it("Pazara Giriş: abonelik + kullanım + masraf yansıtma; KDV", () => {
    const lines = invoiceLines({
      packageCode: "PAZARA_GIRIS",
      avgPallets: 11.2,
      inboundCartons: 40,
      ordersShipped: 900,
      preFbaCartons: 0,
      returnsProcessed: 12,
      disbursements: [{ description: "DHL kargo", amountCents: 312_40 }],
    });
    const by = Object.fromEntries(lines.map((l) => [l.code, l.totalCents]));
    expect(by).toMatchObject({
      SUB: 49_900,
      STORAGE: 12 * 1_300,
      INBOUND: 2_000,
      PICKPACK: 900 * 185,
      RETURNS: 4_800,
      DISB: 31_240,
    });
    expect(lines.find((l) => l.code === "PREFBA")).toBeUndefined();
    const t = invoiceTotals(lines, 19);
    expect(t.netCents).toBe(49_900 + 15_600 + 2_000 + 166_500 + 4_800 + 31_240);
    expect(t.grossCents).toBe(t.netCents + Math.round(t.netCents * 0.19));
  });

  it("Başlangıç paketinde abonelik yok; %0 KDV", () => {
    const lines = invoiceLines({
      packageCode: "BASLANGIC",
      avgPallets: 0,
      inboundCartons: 0,
      ordersShipped: 0,
      preFbaCartons: 0,
      returnsProcessed: 0,
      disbursements: [],
    });
    expect(lines).toEqual([]);
    expect(invoiceTotals(lines, 0)).toEqual({ netCents: 0, vatCents: 0, grossCents: 0 });
  });

  it("dönem aralığı ve hatalı dönem", () => {
    const [a, b] = periodRange("2026-12");
    expect(a.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(b.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(() => periodRange("2026-13")).toThrow();
  });
});
