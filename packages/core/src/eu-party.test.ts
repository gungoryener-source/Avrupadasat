import { describe, expect, it } from "vitest";
import { euPartyInput, pendingRegistrations } from "./eu-party";

const base = {
  importerModel: "OWN_DE_COMPANY" as const,
  responsibleName: "Örnek GmbH",
  responsibleAddress: "Musterstraße 1, 10115 Berlin",
  responsibleEmail: "produkt@ornek.de",
};

describe("AB sorumlu taraf doğrulaması", () => {
  it("model A: temel bilgiler yeterli; boş numaralar null olur", () => {
    const r = euPartyInput.parse({ ...base, lucidNumber: "", weeeNumber: "" });
    expect(r).toMatchObject({ lucidNumber: null, weeeNumber: null, sellsElectrical: false });
    expect(pendingRegistrations(r)).toEqual(["LUCID ambalaj kaydı numarası"]);
  });

  it("model B: ambalaj temsilcisi, elektrikli üründe WEEE temsilcisi zorunlu", () => {
    const b = { ...base, importerModel: "TR_WITH_REPRESENTATIVE" as const };
    expect(euPartyInput.safeParse(b).success).toBe(false);
    expect(euPartyInput.safeParse({ ...b, packagingRepresentative: "Temsilci GmbH" }).success).toBe(
      true,
    );
    const el = euPartyInput.safeParse({
      ...b,
      packagingRepresentative: "T",
      sellsElectrical: true,
    });
    expect(el.success).toBe(false);
    expect(el.error?.issues.map((i) => i.path[0])).toContain("weeeRepresentative");
  });

  it("numara biçimleri ve e-posta", () => {
    expect(euPartyInput.safeParse({ ...base, weeeNumber: "DE 12345678" }).success).toBe(true);
    expect(euPartyInput.safeParse({ ...base, weeeNumber: "12345678" }).success).toBe(false);
    const l = euPartyInput.parse({ ...base, lucidNumber: "DE 1234567890123" });
    expect(l.lucidNumber).toBe("DE1234567890123");
    expect(euPartyInput.safeParse({ ...base, lucidNumber: "DE123" }).success).toBe(false);
    expect(euPartyInput.safeParse({ ...base, responsibleEmail: "yok" }).success).toBe(false);
  });
});
