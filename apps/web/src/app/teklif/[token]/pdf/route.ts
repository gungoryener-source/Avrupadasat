import { db } from "@/server/db";
import { renderQuotePdf } from "@/server/quote-pdf";
import { quoteByToken } from "@/server/quotes";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const q = await quoteByToken(token);
  if (!q) return new Response("Bulunamadı", { status: 404 });
  const full = await db().quote.findUniqueOrThrow({ where: { id: q.id }, include: { lead: true } });
  return renderQuotePdf(full);
}
