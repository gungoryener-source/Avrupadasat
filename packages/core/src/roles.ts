/**
 * Rol tabanlı yetki (RBAC) ve kiracı (tenant) kapsamı.
 * Kural: Müşteri rolleri yalnızca KENDİ firmasının verisini görür.
 */
export const ROLES = [
  "ADMIN",
  "MANAGER",
  "OPS",
  "FINANCE",
  "SALES",
  "PARTNER",
  "SUPPORT",
  "CLIENT_OWNER",
  "CLIENT_USER",
] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES: readonly Role[] = [
  "ADMIN",
  "MANAGER",
  "OPS",
  "FINANCE",
  "SALES",
  "SUPPORT",
];

/** Arayüzde rol adları (talimattaki rol adlarıyla eşleme) */
export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Süper yönetici",
  MANAGER: "Yönetici",
  OPS: "Operasyon yöneticisi",
  FINANCE: "Muhasebe",
  SALES: "Satış",
  PARTNER: "Depo personeli",
  SUPPORT: "Destek",
  CLIENT_OWNER: "Firma yöneticisi",
  CLIENT_USER: "Firma kullanıcısı",
};
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
  /** Müşterinin kendi verisine yazabildiği işlemler */
  "asn.write",
  "document.write",
  "catalog.write",
  "order.read",
  "order.write",
  "message.read",
  "message.write",
  "ticket.read",
  "ticket.write",
  "task.read",
  "task.write",
  "document.review",
  "tax.read",
  "tax.write",
  "staff.manage",
  "subscription.manage",
  /** Müşterinin paket değişikliği talep etmesi */
  "subscription.request",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<Role, readonly Permission[]> = {
  ADMIN: PERMISSIONS,
  /** Personel/yetki ve fiyat listesi yönetimi yalnız Süper yöneticide */
  MANAGER: PERMISSIONS.filter((p) => p !== "staff.manage" && p !== "pricing.manage"),
  SALES: ["lead.read", "lead.write", "quote.write", "tenant.read", "ticket.read", "task.read"],
  OPS: [
    "tenant.read",
    "shipment.read",
    "shipment.write",
    "stock.read",
    "stock.write",
    "document.write",
    "order.read",
    "order.write",
    "message.read",
    "message.write",
    "ticket.read",
    "ticket.write",
    "task.read",
    "task.write",
    "document.review",
    "tax.read",
  ],
  FINANCE: [
    "tenant.read",
    "invoice.read",
    "invoice.write",
    "pricing.manage",
    "data.export",
    "ticket.read",
    "task.read",
    "task.write",
    "tax.read",
    "tax.write",
    "subscription.manage",
  ],
  SUPPORT: [
    "tenant.read",
    "shipment.read",
    "stock.read",
    "order.read",
    "message.read",
    "message.write",
    "ticket.read",
    "ticket.write",
    "task.read",
    "task.write",
  ],
  PARTNER: [
    "tenant.read",
    "shipment.read",
    "shipment.write",
    "stock.read",
    "stock.write",
    "order.read",
    "order.write",
  ],
  CLIENT_OWNER: [
    "tenant.read",
    "user.manage",
    "shipment.read",
    "stock.read",
    "invoice.read",
    "data.export",
    "asn.write",
    "document.write",
    "catalog.write",
    "order.read",
    "message.read",
    "message.write",
    "ticket.read",
    "ticket.write",
    "task.read",
    "tax.read",
    "subscription.request",
  ],
  CLIENT_USER: [
    "tenant.read",
    "shipment.read",
    "stock.read",
    "asn.write",
    "document.write",
    "catalog.write",
    "order.read",
    "message.read",
    "message.write",
    "ticket.read",
    "ticket.write",
    "task.read",
  ],
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
