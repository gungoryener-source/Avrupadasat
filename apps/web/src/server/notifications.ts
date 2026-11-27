/**
 * Uygulama içi bildirimler. Her bildirim tek kullanıcıya aittir (userId);
 * okuma ve işaretleme yalnız sahibine açıktır. E-posta kopyası outbox üzerinden worker'a gider.
 */
import { can, type Permission } from "@avrupadasat/core/roles";
import type { Prisma } from "@avrupadasat/db";
import { db } from "./db";
import { emit } from "./outbox";

export interface NotifyInput {
  type: string;
  title: string;
  body?: string;
  href?: string;
  tenantId?: string | null;
  /** E-posta kopyası da gönderilsin mi */
  email?: boolean;
}

type Tx = Prisma.TransactionClient;

async function write(tx: Tx, userIds: string[], n: NotifyInput) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  await tx.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      tenantId: n.tenantId ?? null,
      type: n.type,
      title: n.title.slice(0, 200),
      body: n.body?.slice(0, 1000) ?? null,
      href: n.href ?? null,
    })),
  });
  if (n.email) {
    const users = await tx.user.findMany({
      where: { id: { in: ids }, disabledAt: null },
      select: { email: true },
    });
    for (const u of users)
      await emit(tx, "notification.email.v1", {
        email: u.email,
        subject: n.title.slice(0, 200),
        body: n.body?.slice(0, 2000),
        href: n.href,
      });
  }
}

/** Belirli kullanıcılara */
export async function notifyUsers(userIds: string[], n: NotifyInput, tx?: Tx) {
  if (tx) return write(tx, userIds, n);
  await db().$transaction((t) => write(t, userIds, n));
}

/** Bir firmanın tüm (etkin) kullanıcılarına */
export async function notifyTenant(tenantId: string, n: NotifyInput, tx?: Tx) {
  const client = tx ?? db();
  const members = await client.membership.findMany({
    where: { tenantId, user: { disabledAt: null } },
    select: { userId: true },
  });
  return notifyUsers(
    members.map((m) => m.userId),
    { ...n, tenantId },
    tx,
  );
}

/** Belirli bir izne sahip ekip üyelerine (ör. yeni destek talebi → ticket.write) */
export async function notifyStaff(permission: Permission, n: NotifyInput, tx?: Tx) {
  const client = tx ?? db();
  const staff = await client.user.findMany({
    where: { staffRole: { not: null }, disabledAt: null },
    select: { id: true, staffRole: true },
  });
  const ids = staff.filter((u) => u.staffRole && can(u.staffRole, permission)).map((u) => u.id);
  return notifyUsers(ids, n, tx);
}

export async function unreadCount(userId: string) {
  return db().notification.count({ where: { userId, readAt: null } });
}

export async function listNotifications(
  userId: string,
  opts: { take?: number; skip?: number } = {},
) {
  const [items, total] = await Promise.all([
    db().notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: opts.take ?? 20,
      skip: opts.skip ?? 0,
    }),
    db().notification.count({ where: { userId } }),
  ]);
  return { items, total };
}

/** Okundu işareti — yalnız kullanıcının kendi bildirimi (id başkasınınsa hiçbir şey değişmez) */
export async function markRead(userId: string, id?: string) {
  const r = await db().notification.updateMany({
    where: { userId, readAt: null, ...(id ? { id } : {}) },
    data: { readAt: new Date() },
  });
  return r.count;
}
