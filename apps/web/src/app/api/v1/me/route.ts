import { db } from "@/server/db";
import { apiActor, json } from "@/server/api-auth";

export async function GET(req: Request) {
  const a = await apiActor(req);
  if (!a) return json({ error: "Yetkisiz" }, 401);
  const tenant = await db().tenant.findUniqueOrThrow({
    where: { id: a.tenantId },
    select: { name: true, packageCode: true, status: true },
  });
  return json({ name: a.name, role: a.role, tenant });
}
