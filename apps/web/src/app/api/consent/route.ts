import { z } from "zod";
import { db } from "@/server/db";
import { hit } from "@/server/rate-limit";
import { sha256 } from "@/server/tokens";

const body = z.object({ analytics: z.boolean(), ads: z.boolean(), version: z.string().max(20) });

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  if (!(await hit(`consent:${ip ?? "?"}`, 30, 3600))) return new Response(null, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  // Günlük tuz: aynı gün içindeki tekrarlar ilişkilendirilebilir, kişi izlenemez
  const day = new Date().toISOString().slice(0, 10);
  await db().consentRecord.create({
    data: {
      ...parsed.data,
      ipHash: ip ? sha256(`${day}:${process.env.AUTH_SECRET ?? ""}:${ip}`).slice(0, 32) : null,
      userAgent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    },
  });
  return new Response(null, { status: 204 });
}
