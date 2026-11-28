"use server";
import { revalidatePath } from "next/cache";
import { isLocale } from "@/i18n/dict";
import { db } from "@/server/db";
import { currentSession } from "@/server/session";

/** Kullanıcının arayüz dilini kaydeder (hesaba bağlı; her cihazda geçerli) */
export async function setLocaleAction(fd: FormData) {
  const s = await currentSession();
  const l = fd.get("locale");
  if (!s?.userId || !s.twoFactorPassed || !isLocale(l)) return;
  await db().user.update({ where: { id: s.userId }, data: { locale: l } });
  revalidatePath("/", "layout");
}
