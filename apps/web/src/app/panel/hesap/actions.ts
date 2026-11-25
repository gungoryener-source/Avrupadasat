"use server";
import { redirect } from "next/navigation";
import { deleteOwnAccount } from "@/server/account";
import { clearSessionCookie, clientIp, requireClient } from "@/server/session";

export type DeleteState = { error?: string } | undefined;

export async function deleteAccountAction(_: DeleteState, fd: FormData): Promise<DeleteState> {
  const s = await requireClient(undefined, "/panel/hesap");
  const r = await deleteOwnAccount(
    s.userId,
    {
      password: String(fd.get("password") ?? ""),
      code: String(fd.get("code") ?? "").trim() || undefined,
      confirm: fd.get("confirm") === "on",
    },
    await clientIp(),
  );
  if (!r.ok) return { error: r.reason };
  await clearSessionCookie();
  redirect("/giris?hesap=silindi");
}
