import { db } from "@/server/db";
import { renderQuotePdf } from "@/server/quote-pdf";
import { requireStaff } from "@/server/session";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireStaff("lead.read");
  const { id } = await params;
  const q = await db().quote.findUnique({ where: { id }, include: { lead: true } });
  if (!q) return new Response("Bulunamadı", { status: 404 });
  return renderQuotePdf(q);
}
