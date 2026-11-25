import Link from "next/link";
import { notFound } from "next/navigation";
import { formatEur } from "@avrupadasat/core/pricing";
import { fmtDate } from "@/components/AppShell";
import { db } from "@/server/db";
import { linesOf, QUOTE_STATUS_LABEL } from "@/server/quotes";
import { requireStaff } from "@/server/session";
import { SendQuote } from "./SendQuote";

export default async function QuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("lead.read");
  const { id } = await params;
  const q = await db().quote.findUnique({ where: { id }, include: { lead: true, contract: true } });
  if (!q) notFound();
  return (
    <>
      <p>
        <Link href="/admin/teklifler">← Teklifler</Link>
      </p>
      <h1>
        Teklif {q.number} <span className="tag">{QUOTE_STATUS_LABEL[q.status]}</span>
      </h1>
      <div className="g2">
        <div className="card">
          <p>
            <b>{q.lead?.companyName}</b>
            <br />
            {q.lead?.email}
          </p>
          <table className="tbl">
            <tbody>
              {linesOf(q).map((l) => (
                <tr key={l.code}>
                  <td>{l.description}</td>
                  <td>{l.recurring ? "Aylık" : "Tek sefer"}</td>
                  <td style={{ textAlign: "right" }}>{formatEur(l.quantity * l.unitCents)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}>
                  <b>Tek seferlik</b>
                </td>
                <td style={{ textAlign: "right" }}>
                  <b>{formatEur(q.oneTimeCents)}</b>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <b>Aylık</b>
                </td>
                <td style={{ textAlign: "right" }}>
                  <b>{formatEur(q.monthlyCents)}</b>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 13 }}>
            Oluşturma {fmtDate(q.createdAt)} · Geçerlilik {fmtDate(q.validUntil)} · Fiyat listesi{" "}
            {q.priceListVersion}
          </p>
          <a className="btn btn-o btn-sm" href={`/admin/teklifler/${q.id}/pdf`}>
            PDF indir
          </a>
        </div>
        <div className="card">
          {q.status === "ACCEPTED" ? (
            <>
              <h3 style={{ marginTop: 0 }}>Onaylandı</h3>
              <p>
                {q.acceptedByName} · {fmtDate(q.acceptedAt, true)}
                <br />
                <span className="muted">IP: {q.acceptedIp ?? "—"}</span>
              </p>
              {q.tenantId && <Link href={`/admin/musteriler/${q.tenantId}`}>Müşteri kartı →</Link>}
            </>
          ) : (
            <>
              <h3 style={{ marginTop: 0 }}>Gönderim</h3>
              <p className="muted" style={{ fontSize: 14 }}>
                Müşteriye tahmin edilemez bir bağlantı gönderilir; teklifi o sayfadan inceleyip
                çevrimiçi onaylar.
                {q.sentAt &&
                  ` Son gönderim: ${fmtDate(q.sentAt, true)}. Yeniden gönderim eski bağlantıyı geçersiz kılar.`}
              </p>
              <SendQuote id={q.id} label={q.sentAt ? "Yeniden gönder" : "Müşteriye gönder"} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
