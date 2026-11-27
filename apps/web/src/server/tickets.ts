/**
 * Destek talepleri. Müşteri yalnız kendi firmasının taleplerini görür (forTenant);
 * iç notlar (internal) müşteri sorgularında hiçbir zaman seçilmez.
 */
import { z } from "zod";
import { canAccessTenant, type Actor, STAFF_ROLES } from "@avrupadasat/core/roles";
import { forTenant, type Priority, type TicketStatus } from "@avrupadasat/db";
import { audit } from "./audit";
import { db } from "./db";
import { notifyStaff, notifyTenant, notifyUsers } from "./notifications";

export const TICKET_CATEGORIES = {
  GENEL: "Genel",
  SIRKET: "Şirket ve kayıtlar",
  VERGI: "Vergi ve muhasebe",
  DEPO: "Depo ve stok",
  SIPARIS: "Sipariş ve iade",
  PAZARYERI: "Pazaryeri",
  FATURA: "Fatura ve ödeme",
  TEKNIK: "Teknik destek",
} as const;
export type TicketCategory = keyof typeof TICKET_CATEGORIES;

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Açık",
  WAITING_TEAM: "Ekipte",
  WAITING_CUSTOMER: "Yanıtınız bekleniyor",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapandı",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Düşük",
  NORMAL: "Normal",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

const createInput = z.object({
  subject: z.string().trim().min(4, "Konu en az 4 karakter olmalı").max(160),
  category: z.enum(Object.keys(TICKET_CATEGORIES) as [TicketCategory, ...TicketCategory[]]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  body: z.string().trim().min(10, "Mesaj en az 10 karakter olmalı").max(8000),
  documentId: z.string().optional(),
});

const isStaff = (a: Actor) => STAFF_ROLES.includes(a.role);

export type Result<T = { id: string }> =
  ({ ok: true } & T) | { ok: false; error: string; fieldErrors?: Record<string, string> };

function fieldErrors(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

/** Müşteri (kendi firması) veya ekip (seçilen firma adına) talep açar */
export async function createTicket(
  actor: Actor,
  tenantId: string,
  input: unknown,
  ip?: string | null,
): Promise<Result<{ id: string; number: number }>> {
  if (!canAccessTenant(actor, tenantId)) return { ok: false, error: "Yetki yok" };
  const p = createInput.safeParse(input);
  if (!p.success)
    return { ok: false, error: "Formu kontrol edin", fieldErrors: fieldErrors(p.error) };
  const staff = isStaff(actor);
  const t = await db().$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        tenantId,
        subject: p.data.subject,
        category: p.data.category,
        priority: p.data.priority as Priority,
        status: staff ? "WAITING_CUSTOMER" : "WAITING_TEAM",
        createdById: actor.userId,
        messages: {
          create: {
            tenantId,
            authorId: actor.userId,
            fromStaff: staff,
            body: p.data.body,
            documentId: p.data.documentId ?? null,
          },
        },
      },
    });
    await audit(
      {
        actorUserId: actor.userId,
        tenantId,
        action: "ticket.created",
        entity: "Ticket",
        entityId: ticket.id,
        meta: { category: p.data.category, priority: p.data.priority },
        ip,
      },
      tx,
    );
    if (staff)
      await notifyTenant(
        tenantId,
        {
          type: "ticket",
          title: `Destek talebi #${ticket.number}: ${p.data.subject}`,
          href: `/panel/destek/${ticket.id}`,
          email: true,
        },
        tx,
      );
    else
      await notifyStaff(
        "ticket.write",
        {
          type: "ticket",
          tenantId,
          title: `Yeni destek talebi #${ticket.number}: ${p.data.subject}`,
          href: `/admin/destek/${ticket.id}`,
        },
        tx,
      );
    return ticket;
  });
  return { ok: true, id: t.id, number: t.number };
}

export interface TicketFilter {
  q?: string;
  status?: TicketStatus | "ACTIVE";
  assigneeId?: string;
  page?: number;
  pageSize?: number;
}

function ticketWhere(f: TicketFilter) {
  return {
    ...(f.status === "ACTIVE"
      ? { status: { in: ["OPEN", "WAITING_TEAM", "WAITING_CUSTOMER"] as TicketStatus[] } }
      : f.status
        ? { status: f.status }
        : {}),
    ...(f.assigneeId ? { assigneeId: f.assigneeId } : {}),
    ...(f.q
      ? {
          OR: [
            { subject: { contains: f.q, mode: "insensitive" as const } },
            ...(/^\d+$/.test(f.q) ? [{ number: Number(f.q) }] : []),
          ],
        }
      : {}),
  };
}

/** Müşterinin talepleri (yalnız kendi firması) */
export async function listTenantTickets(tenantId: string, f: TicketFilter = {}) {
  const size = f.pageSize ?? 20;
  const page = Math.max(1, f.page ?? 1);
  const t = forTenant(db(), tenantId);
  const where = ticketWhere(f);
  const [items, total] = await Promise.all([
    t.ticket.findMany({
      where,
      orderBy: { lastActivity: "desc" },
      take: size,
      skip: (page - 1) * size,
    }),
    t.ticket.count({ where }),
  ]);
  return { items, total, page, pageSize: size };
}

/** Ekip: tüm firmaların talepleri */
export async function listAllTickets(f: TicketFilter = {}) {
  const size = f.pageSize ?? 25;
  const page = Math.max(1, f.page ?? 1);
  const where = ticketWhere(f);
  const [items, total] = await Promise.all([
    db().ticket.findMany({
      where,
      include: { tenant: { select: { name: true } } },
      orderBy: [{ status: "asc" }, { lastActivity: "desc" }],
      take: size,
      skip: (page - 1) * size,
    }),
    db().ticket.count({ where }),
  ]);
  return { items, total, page, pageSize: size };
}

/**
 * Talep + yazışma. Müşteri için iç notlar SORGUDA elenir (yalnız arayüzde gizlemek yetmez).
 * Başka firmanın talebi müşteriye null döner (404).
 */
export async function getTicket(actor: Actor, id: string) {
  const staff = isStaff(actor) || actor.role === "PARTNER";
  const ticket = await db().ticket.findUnique({
    where: { id },
    include: {
      tenant: { select: { id: true, name: true } },
      messages: {
        where: staff ? {} : { internal: false },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!ticket || !canAccessTenant(actor, ticket.tenantId)) return null;
  if (actor.role === "PARTNER") return null;
  const userIds = [
    ...new Set([...ticket.messages.map((m) => m.authorId), ticket.assigneeId ?? ""]),
  ].filter(Boolean);
  const users = await db().user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const names = Object.fromEntries(users.map((u) => [u.id, u.name]));
  return { ...ticket, names };
}

const replyInput = z.object({
  body: z.string().trim().min(2, "Mesaj boş olamaz").max(8000),
  internal: z.boolean().default(false),
  documentId: z.string().optional(),
});

export async function replyTicket(
  actor: Actor,
  id: string,
  input: unknown,
  ip?: string | null,
): Promise<Result> {
  const ticket = await db().ticket.findUnique({ where: { id } });
  if (!ticket || !canAccessTenant(actor, ticket.tenantId) || actor.role === "PARTNER")
    return { ok: false, error: "Talep bulunamadı" };
  const p = replyInput.safeParse(input);
  if (!p.success)
    return { ok: false, error: "Mesajı kontrol edin", fieldErrors: fieldErrors(p.error) };
  const staff = isStaff(actor);
  // Müşteri iç not yazamaz
  const internal = staff ? p.data.internal : false;
  if (ticket.status === "CLOSED" && !staff)
    return { ok: false, error: "Bu talep kapandı; yeni talep açın" };
  await db().$transaction(async (tx) => {
    await tx.ticketMessage.create({
      data: {
        tenantId: ticket.tenantId,
        ticketId: id,
        authorId: actor.userId,
        fromStaff: staff,
        internal,
        body: p.data.body,
        documentId: p.data.documentId ?? null,
      },
    });
    if (!internal)
      await tx.ticket.update({
        where: { id },
        data: {
          lastActivity: new Date(),
          status: staff ? "WAITING_CUSTOMER" : "WAITING_TEAM",
          // İlk ekip yanıtı talebi o kişiye atar
          ...(staff && !ticket.assigneeId ? { assigneeId: actor.userId } : {}),
        },
      });
    await audit(
      {
        actorUserId: actor.userId,
        tenantId: ticket.tenantId,
        action: "ticket.replied",
        entity: "Ticket",
        entityId: id,
        meta: { internal },
        ip,
      },
      tx,
    );
    if (internal) return;
    if (staff)
      await notifyTenant(
        ticket.tenantId,
        {
          type: "ticket",
          title: `Destek talebi #${ticket.number} yanıtlandı`,
          body: ticket.subject,
          href: `/panel/destek/${id}`,
          email: true,
        },
        tx,
      );
    else if (ticket.assigneeId)
      await notifyUsers(
        [ticket.assigneeId],
        {
          type: "ticket",
          tenantId: ticket.tenantId,
          title: `Müşteri yanıtı: #${ticket.number} ${ticket.subject}`,
          href: `/admin/destek/${id}`,
        },
        tx,
      );
    else
      await notifyStaff(
        "ticket.write",
        {
          type: "ticket",
          tenantId: ticket.tenantId,
          title: `Müşteri yanıtı: #${ticket.number} ${ticket.subject}`,
          href: `/admin/destek/${id}`,
        },
        tx,
      );
  });
  return { ok: true, id };
}

const updateInput = z.object({
  status: z.enum(["OPEN", "WAITING_TEAM", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().nullable().optional(),
});

/** Ekip: durum, öncelik, atama */
export async function updateTicket(
  actor: Actor,
  id: string,
  input: unknown,
  ip?: string | null,
): Promise<Result> {
  if (!isStaff(actor)) return { ok: false, error: "Yetki yok" };
  const p = updateInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Geçersiz değer" };
  const ticket = await db().ticket.findUnique({ where: { id } });
  if (!ticket) return { ok: false, error: "Talep bulunamadı" };
  if (p.data.assigneeId) {
    const u = await db().user.findUnique({ where: { id: p.data.assigneeId } });
    if (!u?.staffRole) return { ok: false, error: "Atanan kişi ekip üyesi değil" };
  }
  await db().$transaction(async (tx) => {
    await tx.ticket.update({ where: { id }, data: p.data as never });
    await audit(
      {
        actorUserId: actor.userId,
        tenantId: ticket.tenantId,
        action: "ticket.updated",
        entity: "Ticket",
        entityId: id,
        meta: p.data,
        ip,
      },
      tx,
    );
    if (p.data.status && p.data.status !== ticket.status && p.data.status === "RESOLVED")
      await notifyTenant(
        ticket.tenantId,
        {
          type: "ticket",
          title: `Destek talebi #${ticket.number} çözüldü`,
          body: ticket.subject,
          href: `/panel/destek/${id}`,
        },
        tx,
      );
    if (
      p.data.assigneeId &&
      p.data.assigneeId !== ticket.assigneeId &&
      p.data.assigneeId !== actor.userId
    )
      await notifyUsers(
        [p.data.assigneeId],
        {
          type: "ticket",
          tenantId: ticket.tenantId,
          title: `Size atandı: #${ticket.number} ${ticket.subject}`,
          href: `/admin/destek/${id}`,
        },
        tx,
      );
  });
  return { ok: true, id };
}
