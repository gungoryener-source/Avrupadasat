"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveEuParty } from "@/server/eu-party";
import { requireClient } from "@/server/session";

export type EuPartyState = { ok?: boolean; error?: string; errors?: string[] } | undefined;

export async function saveEuPartyAction(_: EuPartyState, fd: FormData): Promise<EuPartyState> {
  const s = await requireClient("user.manage");
  const v = (k: string) => String(fd.get(k) ?? "");
  try {
    await saveEuParty(
      s.actor.tenantId,
      {
        importerModel: v("importerModel") as never,
        responsibleName: v("responsibleName"),
        responsibleAddress: v("responsibleAddress"),
        responsibleEmail: v("responsibleEmail"),
        lucidNumber: v("lucidNumber"),
        packagingRepresentative: v("packagingRepresentative"),
        sellsElectrical: fd.get("sellsElectrical") === "on",
        weeeNumber: v("weeeNumber"),
        weeeRepresentative: v("weeeRepresentative"),
      },
      s.userId,
    );
  } catch (e) {
    if (e instanceof z.ZodError)
      return { error: "Formdaki alanları kontrol edin", errors: e.issues.map((i) => i.message) };
    return { error: "Kaydedilemedi" };
  }
  revalidatePath("/panel/sirket");
  revalidatePath("/panel");
  return { ok: true };
}
