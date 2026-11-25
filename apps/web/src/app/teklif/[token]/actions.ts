"use server";
import { acceptQuote } from "@/server/quotes";
import { hit } from "@/server/rate-limit";
import { clientIp } from "@/server/session";

export type AcceptState = { ok?: true; error?: string } | undefined;

export async function acceptQuoteAction(_: AcceptState, fd: FormData): Promise<AcceptState> {
  const ip = await clientIp();
  if (!(await hit(`accept:ip:${ip ?? "?"}`, 10, 3600)))
    return { error: "Çok fazla deneme. Biraz sonra tekrar deneyin." };
  if (fd.get("terms") !== "on") return { error: "Şartları onaylamanız gerekiyor." };
  const r = await acceptQuote(String(fd.get("token") ?? ""), String(fd.get("name") ?? ""), ip);
  return r.ok ? { ok: true } : { error: r.reason };
}
