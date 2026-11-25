import { packages } from "@avrupadasat/core/pricing";
import type { Lead, Quote } from "@avrupadasat/db";
import { quotePdf } from "./pdf";
import { linesOf } from "./quotes";

export async function renderQuotePdf(q: Quote & { lead: Lead | null }): Promise<Response> {
  const bytes = await quotePdf({
    number: q.number,
    companyName: q.lead?.companyName ?? "",
    email: q.lead?.email ?? "",
    createdAt: q.createdAt,
    validUntil: q.validUntil,
    packageName: packages[q.packageCode].name,
    lines: linesOf(q),
    oneTimeCents: q.oneTimeCents,
    monthlyCents: q.monthlyCents,
    priceListVersion: q.priceListVersion,
    acceptedAt: q.acceptedAt,
    acceptedByName: q.acceptedByName,
  });
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="teklif-${q.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
