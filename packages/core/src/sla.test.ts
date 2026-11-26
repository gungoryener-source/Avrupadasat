import { describe, expect, it } from "vitest";
import {
  berlinParts,
  businessDaysBetween,
  isShippedOnTime,
  metric,
  nthBusinessDay,
  shipDeadline,
} from "./sla";

describe("SLA zaman hesapları (Europe/Berlin)", () => {
  it("Berlin saatine çevirir (kış saati UTC+1, yaz saati UTC+2)", () => {
    expect(berlinParts(new Date("2026-11-26T12:30:00Z"))).toEqual({
      day: "2026-11-26",
      hour: 13,
      weekday: 4,
    });
    expect(berlinParts(new Date("2026-07-01T12:30:00Z")).hour).toBe(14);
    // UTC'de 23:30 Pazar → Berlin'de Pazartesi
    expect(berlinParts(new Date("2026-11-29T23:30:00Z"))).toMatchObject({
      day: "2026-11-30",
      weekday: 1,
    });
  });

  it("kesim saatinden önce gelen sipariş aynı gün, sonra veya hafta sonu gelen sonraki iş günü", () => {
    expect(shipDeadline(new Date("2026-11-26T12:59:00Z"))).toBe("2026-11-26"); // Perş. 13:59
    expect(shipDeadline(new Date("2026-11-26T13:00:00Z"))).toBe("2026-11-27"); // Perş. 14:00
    expect(shipDeadline(new Date("2026-11-27T15:00:00Z"))).toBe("2026-11-30"); // Cuma 16:00 → Pzt
    expect(shipDeadline(new Date("2026-11-28T09:00:00Z"))).toBe("2026-11-30"); // Cmt → Pzt
  });

  it("zamanında gönderim", () => {
    const o = new Date("2026-11-27T15:00:00Z");
    expect(isShippedOnTime(o, new Date("2026-11-30T16:00:00Z"))).toBe(true);
    expect(isShippedOnTime(o, new Date("2026-12-01T08:00:00Z"))).toBe(false);
  });

  it("iş günü farkı hafta sonunu saymaz", () => {
    expect(
      businessDaysBetween(new Date("2026-11-27T09:00:00Z"), new Date("2026-11-30T09:00:00Z")),
    ).toBe(1);
    expect(
      businessDaysBetween(new Date("2026-11-26T09:00:00Z"), new Date("2026-11-26T17:00:00Z")),
    ).toBe(0);
    expect(
      businessDaysBetween(new Date("2026-11-23T09:00:00Z"), new Date("2026-11-27T09:00:00Z")),
    ).toBe(4);
    expect(nthBusinessDay("2026-11-28", 0)).toBe("2026-11-30");
    expect(nthBusinessDay("2026-11-27", 1)).toBe("2026-11-30");
  });

  it("ölçü özeti", () => {
    expect(metric([0, 1, 2, 3], 2)).toEqual({ count: 4, met: 3, avgDays: 1.5, pct: 75 });
    expect(metric([], 2)).toEqual({ count: 0, met: 0, avgDays: null, pct: null });
  });
});
