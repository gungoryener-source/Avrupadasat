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
import { advanceStage, importStockCounts, receiveShipment } from "@/server/shipments";

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

export async function advanceStageAction(fd: FormData) {
  const input = z
    .object({
      tenantId: z.string().min(1),
      shipmentId: z.string().min(1),
      stage: z.enum(["FABRIKA", "TR_CIKIS", "AB_GIRIS", "GUMRUK"]),
      note: z.string().max(300).optional().default(""),
    })
    .parse(Object.fromEntries(fd));
  const s = await scoped("shipment.write", input.tenantId);
  await advanceStage(input.tenantId, input.shipmentId, input.stage, input.note || null, s.userId);
  revalidatePath(`/admin/sevkiyatlar/${input.shipmentId}`);
}

export async function receiveAction(fd: FormData) {
  const tenantId = z.string().min(1).parse(fd.get("tenantId"));
  const shipmentId = z.string().min(1).parse(fd.get("shipmentId"));
  const s = await scoped("shipment.write", tenantId);
  const counts: { sku: string; receivedQty: number; damagedQty: number }[] = [];
  for (const [k, v] of fd.entries()) {
    if (typeof k === "string" && k.startsWith("r:")) {
      const sku = k.slice(2);
      counts.push({
        sku,
        receivedQty: Math.max(0, Math.trunc(Number(v))),
        damagedQty: Math.max(0, Math.trunc(Number(fd.get(`d:${sku}`) ?? 0))),
      });
    }
  }
  await receiveShipment(tenantId, shipmentId, counts, s.userId);
  revalidatePath(`/admin/sevkiyatlar/${shipmentId}`);
}

export async function stockCountAction(fd: FormData) {
  const tenantId = z.string().min(1).parse(fd.get("tenantId"));
  const s = await scoped("stock.write", tenantId);
  const f = fd.get("file");
  const text =
    f instanceof File && f.size > 0 && f.size < 2 * 1024 * 1024
      ? await f.text()
      : String(fd.get("csv") ?? "");
  await importStockCounts(tenantId, text, s.userId);
  revalidatePath(`/admin/musteriler/${tenantId}`);
}

export async function palletsAction(fd: FormData) {
  const input = z
    .object({ tenantId: z.string().min(1), pallets: z.coerce.number().int().min(0).max(10_000) })
    .parse(Object.fromEntries(fd));
  const s = await scoped("stock.write", input.tenantId);
  await db().tenant.update({
    where: { id: input.tenantId },
    data: { palletsInUse: input.pallets },
  });
  await audit({
    actorUserId: s.userId,
    tenantId: input.tenantId,
    action: "tenant.updated",
    entity: "Tenant",
    entityId: input.tenantId,
    meta: { palletsInUse: input.pallets },
  });
  revalidatePath(`/admin/musteriler/${input.tenantId}`);
}
