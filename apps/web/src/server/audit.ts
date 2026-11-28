import type { Prisma } from "@avrupadasat/db";
import { db } from "./db";

export type AuditAction =
  | "auth.login"
  | "auth.login_failed"
  | "auth.locked"
  | "auth.logout"
  | "auth.2fa_enabled"
  | "auth.password_set"
  | "lead.created"
  | "lead.status_changed"
  | "quote.created"
  | "quote.sent"
  | "quote.accepted"
  | "tenant.created"
  | "tenant.updated"
  | "user.invited"
  | "role.changed"
  | "registration.updated"
  | "shipment.created"
  | "shipment.updated"
  | "document.uploaded"
  | "document.downloaded"
  | "stock.imported"
  | "order.created"
  | "order.updated"
  | "return.created"
  | "invoice.generated"
  | "data.exported"
  | "user.deleted"
  | "pricing.changed"
  | "message.replied"
  | "ticket.created"
  | "ticket.replied"
  | "ticket.updated"
  | "task.created"
  | "task.updated"
  | "document.reviewed"
  | "company.updated"
  | "tax.updated"
  | "subscription.requested"
  | "subscription.changed"
  | "staff.invited"
  | "stock.adjusted"
  | "labels.printed";

export interface AuditInput {
  actorUserId?: string | null;
  tenantId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
}

type Tx = Prisma.TransactionClient;

/** Kişisel veri (şifre, token, IBAN) meta'ya konmaz */
export async function audit(input: AuditInput, tx?: Tx) {
  const client = tx ?? db();
  await client.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      tenantId: input.tenantId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      meta: (input.meta ?? {}) as Prisma.InputJsonValue,
      ip: input.ip ?? null,
    },
  });
}
