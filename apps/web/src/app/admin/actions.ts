"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { issueToken } from "@/server/auth";
import { setLeadStatus } from "@/server/leads";
import { createQuote, sendQuote } from "@/server/quotes";
import { requireStaff } from "@/server/session";
import { env } from "@/server/env";

const leadStatus = z.enum(["NEW", "REPORT_IN_PROGRESS", "REPORT_SENT", "QUOTED", "WON", "LOST"]);

export async function updateLeadAction(fd: FormData) {
  const s = await requireStaff("lead.write");
  const id = z.string().min(1).parse(fd.get("id"));
  const status = leadStatus.parse(fd.get("status"));
  const notes = z
    .string()
    .max(4000)
    .parse(fd.get("notes") ?? "");
  await setLeadStatus(id, status, s.userId, notes);
  revalidatePath(`/admin/talepler/${id}`);
}

export async function createQuoteAction(fd: FormData) {
  const s = await requireStaff("quote.write");
  const input = z
    .object({
      leadId: z.string().min(1),
      packageCode: z.enum(["BASLANGIC", "OPERASYON", "PAZARA_GIRIS"]),
      companyForm: z.enum(["UG", "GMBH", "NONE"]),
      pallets: z.coerce.number().int().min(0).max(10_000),
    })
    .parse(Object.fromEntries(fd));
  const q = await createQuote({ ...input, actorUserId: s.userId });
  redirect(`/admin/teklifler/${q.id}`);
}

export type SendState = { link?: string; error?: string } | undefined;

export async function sendQuoteAction(_: SendState, fd: FormData): Promise<SendState> {
  const s = await requireStaff("quote.write");
  try {
    const token = await sendQuote(z.string().parse(fd.get("id")), s.userId);
    revalidatePath("/admin/teklifler");
    // Bağlantı yalnız bir kez, gönderen kişiye gösterilir (veritabanında yalnız hash'i var)
    return { link: `${env.appUrl}/teklif/${token}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gönderilemedi" };
  }
}

export async function resendInviteAction(fd: FormData) {
  await requireStaff("user.manage");
  await issueToken(z.string().parse(fd.get("userId")), "INVITE");
  revalidatePath(`/admin/musteriler/${String(fd.get("tenantId"))}`);
}
