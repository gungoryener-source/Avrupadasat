/**
 * Operasyon görevleri. Müşteri görünümü AYRI bir select ile kurulur:
 * internalNote, assignee ve createdBy müşteriye hiçbir zaman dönmez.
 */
import { z } from "zod";
import { canAccessTenant, type Actor, STAFF_ROLES, can } from "@avrupadasat/core/roles";
import { forTenant, type Priority, type WorkStatus } from "@avrupadasat/db";
import { audit } from "./audit";
import { db } from "./db";
import { notifyTenant, notifyUsers } from "./notifications";

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  PENDING: "Bekliyor",
  IN_PROGRESS: "Sürüyor",
  COMPLETED: "Tamamlandı",
  ATTENTION: "İlgi gerekiyor",
};

export const TASK_CATEGORIES = {
  GENEL: "Genel",
  SIRKET: "Şirket kuruluşu",
  VERGI: "Vergi ve muhasebe",
  BELGE: "Belge",
  DEPO: "Depo",
  PAZARYERI: "Pazaryeri",
} as const;

/** Müşteriye dönen alanlar — iç not yok */
export const CUSTOMER_TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  category: true,
  dueAt: true,
  priority: true,
  status: true,
  customerAction: true,
  customerUpdate: true,
  completedAt: true,
  updatedAt: true,
  createdAt: true,
} as const;

const taskInput = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter").max(160),
  description: z.string().trim().max(4000).optional(),
  category: z.enum(Object.keys(TASK_CATEGORIES) as [string, ...string[]]).default("GENEL"),
  assigneeId: z.string().optional(),
  dueAt: z.coerce.date().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  customerVisible: z.boolean().default(true),
  customerAction: z.boolean().default(false),
  customerUpdate: z.string().trim().max(2000).optional(),
  internalNote: z.string().trim().max(4000).optional(),
});

type Res =
  { ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

function errs(e: z.ZodError) {
  const o: Record<string, string> = {};
  for (const i of e.issues) o[String(i.path[0])] ??= i.message;
  return o;
}

async function assertStaffAssignee(id?: string | null) {
  if (!id) return true;
  const u = await db().user.findUnique({
    where: { id },
    select: { staffRole: true, disabledAt: true },
  });
  return !!u?.staffRole && !u.disabledAt;
}

export async function createTask(
  actor: Actor,
  tenantId: string,
  input: unknown,
  ip?: string | null,
): Promise<Res> {
  if (!can(actor.role, "task.write") || !canAccessTenant(actor, tenantId))
    return { ok: false, error: "Yetki yok" };
  const p = taskInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Formu kontrol edin", fieldErrors: errs(p.error) };
  if (!(await assertStaffAssignee(p.data.assigneeId)))
    return { ok: false, error: "Atanan kişi ekip üyesi değil" };
  const task = await db().$transaction(async (tx) => {
    const t = await tx.task.create({
      data: {
        tenantId,
        title: p.data.title,
        description: p.data.description || null,
        category: p.data.category,
        assigneeId: p.data.assigneeId || null,
        dueAt: p.data.dueAt ?? null,
        priority: p.data.priority as Priority,
        customerVisible: p.data.customerVisible,
        customerAction: p.data.customerAction,
        customerUpdate: p.data.customerUpdate || null,
        internalNote: p.data.internalNote || null,
        createdById: actor.userId,
      },
    });
    await audit(
      {
        actorUserId: actor.userId,
        tenantId,
        action: "task.created",
        entity: "Task",
        entityId: t.id,
        ip,
      },
      tx,
    );
    if (p.data.assigneeId && p.data.assigneeId !== actor.userId)
      await notifyUsers(
        [p.data.assigneeId],
        {
          type: "task",
          tenantId,
          title: `Size görev atandı: ${t.title}`,
          href: `/admin/gorevler?id=${t.id}`,
        },
        tx,
      );
    if (t.customerVisible)
      await notifyTenant(
        tenantId,
        {
          type: "task",
          title: t.customerAction
            ? `Sizden bir işlem bekleniyor: ${t.title}`
            : `Yeni adım: ${t.title}`,
          body: t.customerUpdate ?? undefined,
          href: "/panel/gorevler",
          email: t.customerAction,
        },
        tx,
      );
    return t;
  });
  return { ok: true, id: task.id };
}

const updateInput = taskInput.partial().extend({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "ATTENTION"]).optional(),
});

/** Ekip günceller; durum değişikliği müşteriye (görünürse) bildirim üretir */
export async function updateTask(
  actor: Actor,
  id: string,
  input: unknown,
  ip?: string | null,
): Promise<Res> {
  if (!can(actor.role, "task.write")) return { ok: false, error: "Yetki yok" };
  const task = await db().task.findUnique({ where: { id } });
  if (!task || !canAccessTenant(actor, task.tenantId))
    return { ok: false, error: "Görev bulunamadı" };
  const p = updateInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Formu kontrol edin", fieldErrors: errs(p.error) };
  if (p.data.assigneeId !== undefined && !(await assertStaffAssignee(p.data.assigneeId)))
    return { ok: false, error: "Atanan kişi ekip üyesi değil" };
  const data: Record<string, unknown> = { ...p.data };
  for (const k of ["description", "customerUpdate", "internalNote", "assigneeId"])
    if (data[k] === "") data[k] = null;
  if (p.data.status === "COMPLETED" && task.status !== "COMPLETED") data.completedAt = new Date();
  if (p.data.status && p.data.status !== "COMPLETED") data.completedAt = null;
  await db().$transaction(async (tx) => {
    const t = await tx.task.update({ where: { id }, data: data as never });
    await audit(
      {
        actorUserId: actor.userId,
        tenantId: task.tenantId,
        action: "task.updated",
        entity: "Task",
        entityId: id,
        meta: { status: p.data.status, assigneeId: p.data.assigneeId },
        ip,
      },
      tx,
    );
    const statusChanged = p.data.status && p.data.status !== task.status;
    const updateChanged =
      p.data.customerUpdate !== undefined && p.data.customerUpdate !== task.customerUpdate;
    if (t.customerVisible && (statusChanged || updateChanged))
      await notifyTenant(
        task.tenantId,
        {
          type: "task",
          title: `${t.title}: ${WORK_STATUS_LABEL[t.status]}`,
          body: t.customerUpdate ?? undefined,
          href: "/panel/gorevler",
          email: t.status === "ATTENTION" || t.status === "COMPLETED",
        },
        tx,
      );
    if (
      p.data.assigneeId &&
      p.data.assigneeId !== task.assigneeId &&
      p.data.assigneeId !== actor.userId
    )
      await notifyUsers(
        [p.data.assigneeId],
        {
          type: "task",
          tenantId: task.tenantId,
          title: `Size görev atandı: ${t.title}`,
          href: `/admin/gorevler?id=${t.id}`,
        },
        tx,
      );
  });
  return { ok: true, id };
}

/** Müşteri: kendisinden beklenen işlemi "yaptım" diye işaretler (yalnız customerAction görevleri) */
export async function customerMarkDone(
  actor: Actor,
  id: string,
  note: string | undefined,
  ip?: string | null,
): Promise<Res> {
  if (!actor.tenantId || STAFF_ROLES.includes(actor.role)) return { ok: false, error: "Yetki yok" };
  const t = forTenant(db(), actor.tenantId);
  const task = await t.task.findFirst({
    where: { id, customerVisible: true, customerAction: true },
  });
  if (!task) return { ok: false, error: "Görev bulunamadı" };
  if (task.status === "COMPLETED") return { ok: false, error: "Görev zaten tamamlandı" };
  const clean = note?.trim().slice(0, 1000);
  await db().$transaction(async (tx) => {
    await tx.task.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        customerAction: false,
        // Müşteri notu iç nota EKLENİR (müşteri iç notu göremez ama ekip görür)
        internalNote: [
          task.internalNote,
          clean ? `Müşteri notu: ${clean}` : "Müşteri işlemi tamamladığını bildirdi",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });
    await audit(
      {
        actorUserId: actor.userId,
        tenantId: task.tenantId,
        action: "task.updated",
        entity: "Task",
        entityId: id,
        meta: { customerDone: true },
        ip,
      },
      tx,
    );
    if (task.assigneeId)
      await notifyUsers(
        [task.assigneeId],
        {
          type: "task",
          tenantId: task.tenantId,
          title: `Müşteri tamamladı: ${task.title}`,
          href: `/admin/gorevler?id=${id}`,
        },
        tx,
      );
  });
  return { ok: true, id };
}

export interface TaskFilter {
  status?: WorkStatus | "OPEN";
  assigneeId?: string;
  tenantId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

function where(f: TaskFilter) {
  return {
    ...(f.status === "OPEN"
      ? { status: { not: "COMPLETED" as WorkStatus } }
      : f.status
        ? { status: f.status }
        : {}),
    ...(f.assigneeId ? { assigneeId: f.assigneeId } : {}),
    ...(f.tenantId ? { tenantId: f.tenantId } : {}),
    ...(f.q ? { title: { contains: f.q, mode: "insensitive" as const } } : {}),
  };
}

export async function listCustomerTasks(tenantId: string, f: TaskFilter = {}) {
  const t = forTenant(db(), tenantId);
  return t.task.findMany({
    where: { ...where(f), customerVisible: true },
    select: CUSTOMER_TASK_SELECT,
    orderBy: [{ status: "asc" }, { dueAt: { sort: "asc", nulls: "last" } }],
    take: 100,
  });
}

export async function listStaffTasks(f: TaskFilter = {}) {
  const size = f.pageSize ?? 25;
  const page = Math.max(1, f.page ?? 1);
  const w = where(f);
  const [items, total] = await Promise.all([
    db().task.findMany({
      where: w,
      include: { tenant: { select: { name: true } } },
      orderBy: [{ status: "asc" }, { dueAt: { sort: "asc", nulls: "last" } }],
      take: size,
      skip: (page - 1) * size,
    }),
    db().task.count({ where: w }),
  ]);
  return { items, total, page, pageSize: size };
}
