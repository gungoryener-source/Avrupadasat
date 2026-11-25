import { z } from "zod";
import { apiLogin, apiLogout, json } from "@/server/api-auth";

const body = z.object({
  email: z.string().max(254),
  password: z.string().max(256),
  code: z.string().max(8).optional(),
});

export async function POST(req: Request) {
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: "Geçersiz istek" }, 400);
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const r = await apiLogin(p.data.email, p.data.password, p.data.code, ip);
  return r.ok
    ? json({ token: r.token, expiresAt: r.expiresAt })
    : json({ error: r.error }, r.status);
}

export async function DELETE(req: Request) {
  await apiLogout(req);
  return new Response(null, { status: 204 });
}
