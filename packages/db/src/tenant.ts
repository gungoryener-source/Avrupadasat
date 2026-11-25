import type { PrismaClient } from "./generated/prisma/client";

/** tenantId alanı ZORUNLU olan modeller — sorgulara otomatik filtre eklenir */
export const TENANT_SCOPED_MODELS = new Set([
  "Membership",
  "PartnerAssignment",
  "RegistrationTask",
  "Shipment",
  "StockItem",
  "Contract",
  "TenantContact",
  "ShipmentEvent",
  "AsnLine",
  "Document",
  "StockMovement",
  "MarketplaceConnection",
  "Order",
  "OrderLine",
  "WorkOrder",
  "ReturnItem",
  "Disbursement",
  "StorageSnapshot",
  "Invoice",
  "CustomerMessage",
  "ProductContent",
]);

const READ_OPS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

export class TenantScopeError extends Error {}

/**
 * Tek bir firmaya kilitli Prisma istemcisi.
 * - Okuma/güncelleme/silme sorgularına `where.tenantId` eklenir.
 * - Oluşturma sorgularında `data.tenantId` zorlanır; başka firma id'si verilirse hata.
 * - Ham SQL kapatılır.
 */
export function forTenant(prisma: PrismaClient, tenantId: string) {
  if (!tenantId) throw new TenantScopeError("tenantId boş olamaz");

  const enforceData = (data: unknown) => {
    if (!data || typeof data !== "object") return data;
    const d = data as Record<string, unknown>;
    if (d.tenantId !== undefined && d.tenantId !== tenantId) {
      throw new TenantScopeError("Başka firmaya kayıt yazılamaz");
    }
    if ("tenant" in d) throw new TenantScopeError("tenant ilişkisi doğrudan bağlanamaz");
    return { ...d, tenantId };
  };

  const scopeWhere = (where: unknown) => {
    const w = (where ?? {}) as Record<string, unknown>;
    if (w.tenantId !== undefined && w.tenantId !== tenantId) {
      throw new TenantScopeError("Başka firmanın verisi sorgulanamaz");
    }
    return { ...w, tenantId };
  };

  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model)) {
            throw new TenantScopeError(`${model} tenant kapsamlı istemciyle sorgulanamaz`);
          }
          const a = (args ?? {}) as Record<string, unknown>;
          if (READ_OPS.has(operation)) {
            a.where = scopeWhere(a.where);
            if (operation === "update" || operation === "updateMany") {
              const data = (a.data ?? {}) as Record<string, unknown>;
              if (data.tenantId !== undefined && data.tenantId !== tenantId) {
                throw new TenantScopeError("Kayıt başka firmaya taşınamaz");
              }
            }
          } else if (operation === "create") {
            a.data = enforceData(a.data);
          } else if (operation === "createMany" || operation === "createManyAndReturn") {
            const rows = Array.isArray(a.data) ? a.data : [a.data];
            a.data = rows.map(enforceData);
          } else if (operation === "upsert") {
            a.where = scopeWhere(a.where);
            a.create = enforceData(a.create);
          } else {
            throw new TenantScopeError(`Desteklenmeyen işlem: ${operation}`);
          }
          return query(a as typeof args);
        },
      },
      $queryRaw: () => {
        throw new TenantScopeError("Tenant istemcisinde ham SQL kapalı");
      },
      $executeRaw: () => {
        throw new TenantScopeError("Tenant istemcisinde ham SQL kapalı");
      },
      $queryRawUnsafe: () => {
        throw new TenantScopeError("Tenant istemcisinde ham SQL kapalı");
      },
      $executeRawUnsafe: () => {
        throw new TenantScopeError("Tenant istemcisinde ham SQL kapalı");
      },
    },
  });
}

export type TenantClient = ReturnType<typeof forTenant>;
