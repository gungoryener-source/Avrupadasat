"use server";
import { revalidatePath } from "next/cache";
import { approveAndSend, generateDraft } from "@/server/messages";
import { requireClient } from "@/server/session";

export type MsgState = { error?: string } | undefined;

export async function draftAction(_: MsgState, fd: FormData): Promise<MsgState> {
  const s = await requireClient("message.write");
  const id = String(fd.get("id") ?? "");
  const r = await generateDraft(s.actor.tenantId, id);
  revalidatePath(`/panel/mesajlar/${id}`);
  return r.ok ? undefined : { error: r.reason };
}

export async function sendAction(_: MsgState, fd: FormData): Promise<MsgState> {
  const s = await requireClient("message.write");
  if (fd.get("confirm") !== "on") return { error: "Göndermeden önce onay kutusunu işaretleyin." };
  const id = String(fd.get("id") ?? "");
  const r = await approveAndSend(s.actor.tenantId, id, String(fd.get("final") ?? ""), s.userId);
  revalidatePath(`/panel/mesajlar/${id}`);
  return r.ok ? undefined : { error: r.reason };
}
