/**
 * Tenant izolasyon testleri — ZORUNLU. Gerçek PostgreSQL gerektirir (CI'da servis olarak çalışır).
 * DATABASE_URL yoksa atlanır.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "./client";
import { forTenant, TenantScopeError } from "./tenant";
import type { PrismaClient } from "./generated/prisma/client";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("tenant izolasyonu", () => {
  let prisma: PrismaClient;
  let a: string;
  let b: string;
  const run = `t${Date.now()}`;

  beforeAll(async () => {
    prisma = createPrismaClient();
    a = (await prisma.tenant.create({ data: { name: "A", slug: `${run}-a` } })).id;
    b = (await prisma.tenant.create({ data: { name: "B", slug: `${run}-b` } })).id;
    await prisma.shipment.create({ data: { tenantId: a, reference: "A-1", pallets: 4 } });
    await prisma.shipment.create({ data: { tenantId: b, reference: "B-1", pallets: 9 } });
    await prisma.stockItem.create({
      data: { tenantId: b, sku: "B-SKU", name: "Havlu", quantity: 50 },
    });
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { slug: { startsWith: run } } });
    await prisma.$disconnect();
  });

  it("firma yalnız kendi sevkiyatlarını listeler", async () => {
    const rows = await forTenant(prisma, a).shipment.findMany();
    expect(rows.map((r) => r.reference)).toEqual(["A-1"]);
  });

  it("başka firmanın kaydı id ile bile okunamaz", async () => {
    const other = await prisma.shipment.findFirstOrThrow({ where: { tenantId: b } });
    expect(await forTenant(prisma, a).shipment.findUnique({ where: { id: other.id } })).toBeNull();
    await expect(
      forTenant(prisma, a).shipment.findFirst({ where: { tenantId: b } }),
    ).rejects.toThrow(TenantScopeError);
  });

  it("başka firmanın kaydı güncellenemez / silinemez", async () => {
    const other = await prisma.shipment.findFirstOrThrow({ where: { tenantId: b } });
    const ta = forTenant(prisma, a);
    await expect(
      ta.shipment.update({ where: { id: other.id }, data: { pallets: 0 } }),
    ).rejects.toThrow();
    expect((await ta.shipment.updateMany({ data: { pallets: 1 } })).count).toBe(1);
    expect((await ta.stockItem.deleteMany({})).count).toBe(0);
    const still = await prisma.shipment.findUniqueOrThrow({ where: { id: other.id } });
    expect(still.pallets).toBe(9);
    expect(await prisma.stockItem.count({ where: { tenantId: b } })).toBe(1);
  });

  it("oluşturmada tenantId zorlanır, başka firmaya yazılamaz", async () => {
    const ta = forTenant(prisma, a);
    const s = await ta.shipment.create({ data: { reference: "A-2" } as never });
    expect(s.tenantId).toBe(a);
    await expect(ta.shipment.create({ data: { tenantId: b, reference: "X" } })).rejects.toThrow(
      TenantScopeError,
    );
  });

  it("sayım ve toplama yalnız kendi verisini kapsar", async () => {
    const ta = forTenant(prisma, b);
    expect(await ta.shipment.count()).toBe(1);
    const agg = await ta.shipment.aggregate({ _sum: { pallets: true } });
    expect(agg._sum.pallets).toBe(9);
  });

  it("kapsam dışı model ve ham SQL kapalı", async () => {
    const ta = forTenant(prisma, a);
    await expect(ta.tenant.findMany()).rejects.toThrow(TenantScopeError);
    await expect(ta.$queryRawUnsafe("SELECT 1")).rejects.toThrow(TenantScopeError);
    await expect(ta.$executeRaw`DELETE FROM "Shipment"`).rejects.toThrow(TenantScopeError);
    expect(await prisma.shipment.count({ where: { tenantId: b } })).toBe(1);
  });
});
