import { db } from "@/server/db";
import { deleteOwnAccount } from "@/server/account";
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

/** Mobil uygulamadan hesap silme (parola + gerekiyorsa TOTP ile yeniden doğrulama) */
export async function DELETE(req: Request) {
  const a = await apiActor(req);
  if (!a) return json({ error: "Yetkisiz" }, 401);
  const body = (await req.json().catch(() => null)) as {
    password?: unknown;
    code?: unknown;
    confirm?: unknown;
  } | null;
  const r = await deleteOwnAccount(
    a.userId,
    {
      password: typeof body?.password === "string" ? body.password : "",
      code: typeof body?.code === "string" ? body.code : undefined,
      confirm: body?.confirm === true,
    },
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  );
  if (!r.ok) return json({ error: r.reason }, 400);
  return new Response(null, { status: 204 });
}
