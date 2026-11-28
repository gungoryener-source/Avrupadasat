import { cache } from "react";
import { db } from "@/server/db";
import { currentSession } from "@/server/session";
import { isLocale, makeT, type Locale } from "./dict";

/** Oturumdaki kullanıcının dili (istek başına bir kez okunur) */
export const currentLocale = cache(async (): Promise<Locale> => {
  const s = await currentSession();
  if (!s?.userId) return "tr";
  const u = await db().user.findUnique({ where: { id: s.userId }, select: { locale: true } });
  return isLocale(u?.locale) ? u.locale : "tr";
});

export async function getT() {
  const locale = await currentLocale();
  return { locale, t: makeT(locale) };
}
