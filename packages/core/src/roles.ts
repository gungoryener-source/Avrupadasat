/**
 * Rol tabanlı yetki (RBAC) ve kiracı (tenant) kapsamı.
 * Kural: Müşteri rolleri yalnızca KENDİ firmasının verisini görür.
 */
export const ROLES = [
  "ADMIN",
  "OPS",
  "FINANCE",
  "SALES",
  "PARTNER",
  "CLIENT_OWNER",
  "CLIENT_USER",
] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES: readonly Role[] = ["ADMIN", "OPS", "FINANCE", "SALES"];
export const CLIENT_ROLES: readonly Role[] = ["CLIENT_OWNER", "CLIENT_USER"];

export const PERMISSIONS = [
  "lead.read",
  "lead.write",
  "quote.write",
  "tenant.read",
  "tenant.manage",
  "user.manage",
  "shipment.read",
  "shipment.write",
  "stock.read",
  "stock.write",
  "invoice.read",
  "invoice.write",
  "pricing.manage",
  "audit.read",
  "data.export",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<Role, readonly Permission[]> = {
  ADMIN: PERMISSIONS,
  SALES: ["lead.read", "lead.write", "quote.write", "tenant.read"],
  OPS: ["tenant.read", "shipment.read", "shipment.write", "stock.read", "stock.write"],
  FINANCE: ["tenant.read", "invoice.read", "invoice.write", "pricing.manage", "data.export"],
  PARTNER: ["shipment.read", "shipment.write", "stock.read", "stock.write"],
  CLIENT_OWNER: [
    "tenant.read",
    "user.manage",
    "shipment.read",
    "stock.read",
    "invoice.read",
    "data.export",
  ],
  CLIENT_USER: ["tenant.read", "shipment.read", "stock.read"],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export interface Actor {
  userId: string;
  role: Role;
  /** Müşteri kullanıcısının bağlı olduğu firma */
  tenantId: string | null;
  /** PARTNER (ör. depo) için atanmış müşteri firmaları */
  partnerTenantIds?: readonly string[];
}

/** Bir aktör belirli bir firmanın verisine erişebilir mi? */
export function canAccessTenant(actor: Actor, tenantId: string): boolean {
  if (STAFF_ROLES.includes(actor.role)) return true;
  if (actor.role === "PARTNER") return actor.partnerTenantIds?.includes(tenantId) ?? false;
  return actor.tenantId !== null && actor.tenantId === tenantId;
}

/** 2FA zorunlu roller (ekip ve firma yöneticileri) */
export function requiresTwoFactor(role: Role): boolean {
  return role !== "CLIENT_USER";
}
