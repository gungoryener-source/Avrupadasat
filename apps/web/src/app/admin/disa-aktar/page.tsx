import { DATEV_DEFAULTS } from "@/server/exports";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Muhasebe dışa aktarımı" };

export default async function ExportPage() {
  await requireStaff("data.export");
  const prev = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 7);
  return (
    <>
      <h1>Muhasebe dışa aktarımı</h1>
      <form
        action="/admin/disa-aktar/datev"
        method="get"
        className="card form"
        style={{ maxWidth: 560 }}
      >
        <h2 style={{ margin: 0, fontSize: 19 }}>DATEV uyumlu fatura listesi</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Kesilmiş faturalar (Buchungsstapel sütunları). Gelir hesabı %19:{" "}
          {DATEV_DEFAULTS.revenueAccount19}, %0: {DATEV_DEFAULTS.revenueAccount0}, Debitor{" "}
          {DATEV_DEFAULTS.debitorBase + 1}&apos;den başlar. Hesap eşlemesi vergi danışmanıyla
          doğrulanacak.
        </p>
        <div className="field">
          <label htmlFor="donem">Dönem</label>
          <input id="donem" name="donem" defaultValue={prev} pattern="\d{4}-\d{2}" required />
        </div>
        <button className="btn" type="submit">
          CSV indir
        </button>
      </form>
    </>
  );
}
