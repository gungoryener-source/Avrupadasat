"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canAccessTenant } from "@avrupadasat/core/roles";
import { registrationSteps } from "@avrupadasat/core/events";
import { forTenant } from "@avrupadasat/db";
import { audit } from "@/server/audit";
import { db } from "@/server/db";
import { emit } from "@/server/outbox";
import { requireStaff } from "@/server/session";

async function scoped(permission: Parameters<typeof requireStaff>[0], tenantId: string) {
  const s = await requireStaff(permission);
  if (!canAccessTenant(s.actor, tenantId)) redirect("/admin?hata=yetki");
  return s;
}

export async function updateRegistrationAction(fd: FormData) {
  const input = z
    .object({
      tenantId: z.string().min(1),
      step: z.enum(registrationSteps),
      status: z.enum(["BEKLIYOR", "SURUYOR", "TAMAM", "SORUN"]),
      note: z.string().max(500).optional().default(""),
    })
    .parse(Object.fromEntries(fd));
  const s = await scoped("tenant.manage", input.tenantId);
  await db().$transaction(async (tx) => {
    const t = forTenant(db(), input.tenantId);
    const before = await t.registrationTask.findUnique({
      where: { tenantId_step: { tenantId: input.tenantId, step: input.step } },
    });
    await tx.registrationTask.update({
      where: { tenantId_step: { tenantId: input.tenantId, step: input.step } },
      data: { status: input.status, note: input.note || null },
    });
    if (before?.status !== input.status) {
      await emit(
        tx,
        "registration.status_changed.v1",
        { step: input.step, status: input.status, note: input.note || undefined },
        { tenantId: input.tenantId },
      );
    }
    await audit(
      {
        actorUserId: s.userId,
        tenantId: input.tenantId,
        action: "registration.updated",
        entity: "RegistrationTask",
        entityId: input.step,
        meta: { status: input.status },
      },
      tx,
    );
  });
  revalidatePath(`/admin/musteriler/${input.tenantId}`);
}

export async function updateTenantStatusAction(fd: FormData) {
  const input = z
    .object({
      tenantId: z.string().min(1),
      status: z.enum(["ONBOARDING", "ACTIVE", "PAUSED", "CLOSED"]),
    })
    .parse(Object.fromEntries(fd));
  const s = await scoped("tenant.manage", input.tenantId);
  await db().tenant.update({ where: { id: input.tenantId }, data: { status: input.status } });
  await audit({
    actorUserId: s.userId,
    tenantId: input.tenantId,
    action: "tenant.updated",
    entity: "Tenant",
    entityId: input.tenantId,
    meta: { status: input.status },
  });
  revalidatePath(`/admin/musteriler/${input.tenantId}`);
}
