import type { Metadata } from "next";
import { brand } from "@avrupadasat/core/brand.config";
import { formatEur, packages } from "@avrupadasat/core/pricing";
import { Logo } from "@avrupadasat/ui";
import { fmtDate } from "@/components/AppShell";
import { linesOf, quoteByToken } from "@/server/quotes";
import { AcceptForm } from "./AcceptForm";

export const metadata: Metadata = { title: "Teklifiniz", robots: { index: false, follow: false } };

export default async function PublicQuote({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const q = await quoteByToken(token);
  return (
    <main className="wrap" style={{ maxWidth: 820, padding: "36px 20px" }}>
      <Logo />
      {!q ? (
        <div className="card" style={{ marginTop: 24 }}>
          <h1 style={{ marginTop: 0 }}>Teklif bulunamadı</h1>
          <p className="muted">
            Bağlantı geçersiz veya yerine yeni bir teklif gönderilmiş olabilir.
          </p>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="k">Teklif {q.number}</div>
          <h1 style={{ margin: "6px 0 4px" }}>{q.lead?.companyName}</h1>
          <p className="muted">
            {packages[q.packageCode].name} paketi · Geçerlilik {fmtDate(q.validUntil)}
          </p>
          <table className="tbl" style={{ margin: "18px 0" }}>
            <tbody>
              {linesOf(q).map((l) => (
                <tr key={l.code}>
                  <td>{l.description}</td>
                  <td>{l.recurring ? "Aylık" : "Tek sefer"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {formatEur(l.quantity * l.unitCents)}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}>
                  <b>Tek seferlik toplam</b>
                </td>
                <td style={{ textAlign: "right" }}>
                  <b>{formatEur(q.oneTimeCents)}</b>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <b>Aylık toplam</b>
                </td>
                <td style={{ textAlign: "right" }}>
                  <b>{formatEur(q.monthlyCents)}</b>
                </td>
              </tr>
            </tbody>
          </table>
          <ul className="muted" style={{ fontSize: 13, paddingLeft: 18 }}>
            <li>Tutarlar KDV hariçtir.</li>
            <li>
              Noter, ticaret sicili ve devlet harçları ile şirket sermayesi dahil değildir;
              gerçekleşen tutar birebir yansıtılır.
            </li>
            <li>
              Depolama, paketleme, iade ve kargo yayınlanan fiyat listesine göre kullanım kadar
              faturalanır. Kurulum ücreti yok, aylık fesih.
            </li>
            <li>{brand.independenceNotice}</li>
          </ul>
          <p>
            <a className="btn btn-o btn-sm" href={`/teklif/${token}/pdf`}>
              PDF olarak indir
            </a>
          </p>
          {q.status === "SENT" && <AcceptForm token={token} />}
          {q.status === "ACCEPTED" && (
            <p className="alert-ok">
              Bu teklif {fmtDate(q.acceptedAt, true)} tarihinde {q.acceptedByName} tarafından
              onaylandı. Panel davetiniz e-postanıza gönderildi.
            </p>
          )}
          {q.status === "EXPIRED" && (
            <p className="alert-err">
              Bu teklifin süresi doldu. Güncel teklif için bizimle iletişime geçin.
            </p>
          )}
          {q.status === "REJECTED" && <p className="alert-err">Bu teklif geçerli değil.</p>}
        </div>
      )}
    </main>
  );
}
