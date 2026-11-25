import { apiActor, json, PUSH_TOKEN_RE, setPushToken } from "@/server/api-auth";

/** Mobil cihazın anlık bildirim anahtarını kaydeder (PUT) veya kaldırır (DELETE) */
export async function PUT(req: Request) {
  const a = await apiActor(req);
  if (!a) return json({ error: "Yetkisiz" }, 401);
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  if (!PUSH_TOKEN_RE.test(token)) return json({ error: "Geçersiz bildirim anahtarı" }, 400);
  await setPushToken(a.apiTokenId, token);
  return new Response(null, { status: 204 });
}

export async function DELETE(req: Request) {
  const a = await apiActor(req);
  if (!a) return json({ error: "Yetkisiz" }, 401);
  await setPushToken(a.apiTokenId, null);
  return new Response(null, { status: 204 });
}
