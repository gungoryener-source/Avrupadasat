/** Ekip paneli için ortak seçim listeleri (firma, ekip üyesi) */
import type { Actor } from "@avrupadasat/core/roles";
import { db } from "./db";

export async function staffOptions() {
  const u = await db().user.findMany({
    where: { staffRole: { not: null, notIn: ["PARTNER"] }, disabledAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return u.map((x) => ({ value: x.id, label: x.name }));
}

export async function tenantOptions(actor: Actor) {
  const t = await db().tenant.findMany({
    where:
      actor.role === "PARTNER" ? { id: { in: [...(actor.partnerTenantIds ?? [])] } } : undefined,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return t.map((x) => ({ value: x.id, label: x.name }));
}

/** PARTNER yalnız atandığı firmaları görür; diğer ekip rolleri tümünü */
export function tenantScope(actor: Actor, firma?: string) {
  if (actor.role === "PARTNER") {
    const ids = [...(actor.partnerTenantIds ?? [])];
    return { tenantId: firma && ids.includes(firma) ? firma : { in: ids } };
  }
  return firma ? { tenantId: firma } : {};
}
