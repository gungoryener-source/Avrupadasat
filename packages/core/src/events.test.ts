import { describe, expect, it } from "vitest";
import { parseEvent } from "./events";

const valid = {
  companyName: "Yıldız Mobilya",
  email: "info@yildiz.com.tr",
  phone: "+90 532 000 00 00",
  category: "mobilya",
  consentKvkk: true,
};

describe("lead.submitted.v1", () => {
  it("geçerli formu kabul eder, varsayılanları doldurur", () => {
    const p = parseEvent("lead.submitted.v1", valid);
    expect(p.marketingConsent).toBe(false);
    expect(p.attribution).toEqual({});
  });

  it("KVKK onayı olmadan reddeder", () => {
    expect(() => parseEvent("lead.submitted.v1", { ...valid, consentKvkk: false })).toThrow();
  });

  it("geçersiz e-postayı reddeder", () => {
    expect(() => parseEvent("lead.submitted.v1", { ...valid, email: "x" })).toThrow();
  });

  it("bilinmeyen kategoriyi reddeder", () => {
    expect(() => parseEvent("lead.submitted.v1", { ...valid, category: "silah" })).toThrow();
  });
});
