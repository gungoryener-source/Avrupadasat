import { describe, expect, it } from "vitest";
import { can, canAccessTenant, requiresTwoFactor } from "./roles";

describe("RBAC", () => {
  it("müşteri kullanıcısı fatura göremez, firma sahibi görür", () => {
    expect(can("CLIENT_USER", "invoice.read")).toBe(false);
    expect(can("CLIENT_OWNER", "invoice.read")).toBe(true);
  });

  it("satış ekibi stok değiştiremez", () => {
    expect(can("SALES", "stock.write")).toBe(false);
  });

  it("yalnız ADMIN ve FINANCE fiyat yönetir", () => {
    expect(can("ADMIN", "pricing.manage")).toBe(true);
    expect(can("FINANCE", "pricing.manage")).toBe(true);
    expect(can("OPS", "pricing.manage")).toBe(false);
  });
});

describe("Tenant kapsamı", () => {
  it("müşteri yalnız kendi firmasına erişir", () => {
    const a = { userId: "u1", role: "CLIENT_OWNER" as const, tenantId: "t1" };
    expect(canAccessTenant(a, "t1")).toBe(true);
    expect(canAccessTenant(a, "t2")).toBe(false);
  });

  it("firmasız müşteri hiçbir firmaya erişemez", () => {
    expect(canAccessTenant({ userId: "u", role: "CLIENT_USER", tenantId: null }, "t1")).toBe(false);
  });

  it("partner yalnız atandığı firmalara erişir", () => {
    const p = { userId: "p", role: "PARTNER" as const, tenantId: null, partnerTenantIds: ["t1"] };
    expect(canAccessTenant(p, "t1")).toBe(true);
    expect(canAccessTenant(p, "t2")).toBe(false);
  });

  it("ekip tüm firmalara erişir", () => {
    expect(canAccessTenant({ userId: "s", role: "OPS", tenantId: null }, "t9")).toBe(true);
  });

  it("2FA yalnız müşteri kullanıcısı için isteğe bağlı", () => {
    expect(requiresTwoFactor("CLIENT_USER")).toBe(false);
    expect(requiresTwoFactor("CLIENT_OWNER")).toBe(true);
    expect(requiresTwoFactor("ADMIN")).toBe(true);
  });
});
