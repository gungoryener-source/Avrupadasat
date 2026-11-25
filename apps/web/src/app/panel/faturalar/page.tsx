import { forTenant } from "@avrupadasat/db";
import { formatEur } from "@avrupadasat/core/pricing";
import { fmtDate } from "@/components/AppShell";
import { db } from "@/server/db";
import { INVOICE_STATUS } from "@/server/labels-ops";
import { requireClient } from "@/server/session";

export const metadata = { title: "Faturalar" };

export default async function InvoicesPage() {
  const s = await requireClient("invoice.read");
  const invs = await forTenant(db(), s.actor.tenantId).invoice.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: { issuedAt: "desc" },
  });
  return (
    <>
      <h1>Faturalar</h1>
      <table className="tbl">
        <thead>
          <tr>
            <th>No</th>
            <th>Dönem</th>
            <th>Net</th>
            <th>Toplam</th>
            <th>Vade</th>
            <th>Durum</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {invs.map((i) => (
            <tr key={i.id}>
              <td className="mono">{i.number}</td>
              <td>{i.period}</td>
              <td>{formatEur(i.netCents, { decimals: true })}</td>
              <td>
                <b>{formatEur(i.grossCents, { decimals: true })}</b>
              </td>
              <td>{fmtDate(i.dueAt)}</td>
              <td>
                <span className={`tag ${INVOICE_STATUS[i.status][1]}`}>
                  {INVOICE_STATUS[i.status][0]}
                </span>
              </td>
              <td>
                <a href={`/fatura/${i.id}`} target="_blank" rel="noopener">
                  PDF
                </a>
              </td>
            </tr>
          ))}
          {invs.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">
                Henüz fatura yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
