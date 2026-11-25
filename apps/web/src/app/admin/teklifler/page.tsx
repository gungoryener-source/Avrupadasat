import Link from "next/link";
import { formatEur } from "@avrupadasat/core/pricing";
import { fmtDate } from "@/components/AppShell";
import { db } from "@/server/db";
import { QUOTE_STATUS_LABEL } from "@/server/quotes";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Teklifler" };

export default async function QuotesPage() {
  await requireStaff("lead.read");
  const quotes = await db().quote.findMany({
    include: { lead: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <h1>Teklifler</h1>
      <table className="tbl">
        <thead>
          <tr>
            <th>No</th>
            <th>Firma</th>
            <th>Paket</th>
            <th>Tek sefer</th>
            <th>Aylık</th>
            <th>Durum</th>
            <th>Tarih</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id}>
              <td>
                <Link href={`/admin/teklifler/${q.id}`}>{q.number}</Link>
              </td>
              <td>{q.lead?.companyName ?? "—"}</td>
              <td>{q.packageCode}</td>
              <td>{formatEur(q.oneTimeCents)}</td>
              <td>{formatEur(q.monthlyCents)}</td>
              <td>
                <span
                  className={`tag ${q.status === "ACCEPTED" ? "ok" : q.status === "SENT" ? "warn" : ""}`}
                >
                  {QUOTE_STATUS_LABEL[q.status]}
                </span>
              </td>
              <td>{fmtDate(q.createdAt)}</td>
            </tr>
          ))}
          {quotes.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">
                Henüz teklif yok. Bir talebin sayfasından oluşturabilirsiniz.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
