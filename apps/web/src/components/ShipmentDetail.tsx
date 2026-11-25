import type { AsnLine, Document, Shipment, ShipmentEvent } from "@avrupadasat/db";
import { shipmentStages } from "@avrupadasat/core/events";
import { fmtDate } from "@/components/AppShell";
import { DOC_KIND_LABEL, missingDocs } from "@/server/documents";
import { signDownload } from "@/server/files";
import { STAGE_LABEL } from "@/server/labels";

type Full = Shipment & { events: ShipmentEvent[]; lines: AsnLine[]; documents: Document[] };

/** Müşteri ve ekip panelinde ortak sevkiyat görünümü */
export function ShipmentDetail({ s, userId }: { s: Full; userId: string }) {
  const reached = new Set(s.events.map((e) => e.stage));
  const current = shipmentStages.indexOf(s.stage);
  const miss = missingDocs(s.documents.map((d) => d.kind));
  return (
    <div className="g2">
      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: 19 }}>Takip</h2>
        <ol className="timeline">
          {shipmentStages.map((st, i) => {
            const ev = [...s.events].reverse().find((e) => e.stage === st);
            const state =
              i < current || reached.has(st)
                ? i <= current
                  ? "done"
                  : ""
                : i === current
                  ? "done"
                  : "";
            return (
              <li key={st} className={state}>
                <b>{STAGE_LABEL[st]}</b>
                <span className="muted" style={{ fontSize: 13 }}>
                  {ev
                    ? `${fmtDate(ev.at, true)}${ev.note ? ` · ${ev.note}` : ""}`
                    : i > current
                      ? "Bekleniyor"
                      : "—"}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="muted" style={{ fontSize: 13 }}>
          {s.pallets} palet · {s.cartons} koli {s.origin && `· ${s.origin}`}{" "}
          {s.carrier && `· ${s.carrier}`}{" "}
          {s.expectedAt && `· tahmini varış ${fmtDate(s.expectedAt)}`}
        </p>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: 19 }}>Belgeler</h2>
        {miss.length > 0 && (
          <p className="alert-err">Eksik: {miss.map((k) => DOC_KIND_LABEL[k]).join(", ")}</p>
        )}
        <table className="tbl">
          <tbody>
            {s.documents.map((d) => (
              <tr key={d.id}>
                <td>{DOC_KIND_LABEL[d.kind]}</td>
                <td>
                  <a href={signDownload(d.id, userId)}>{d.filename}</a>
                </td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {Math.ceil(d.size / 1024)} KB · {fmtDate(d.createdAt)}
                </td>
              </tr>
            ))}
            {s.documents.length === 0 && (
              <tr>
                <td className="muted">Belge yok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="card" style={{ gridColumn: "1 / -1" }}>
        <h2 style={{ marginTop: 0, fontSize: 19 }}>Ürünler</h2>
        <table className="tbl">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Bildirilen</th>
              <th>Sayılan</th>
              <th>Hasarlı</th>
              <th>Fark</th>
            </tr>
          </thead>
          <tbody>
            {s.lines.map((l) => {
              const diff = l.receivedQty === null ? null : l.receivedQty - l.quantity;
              return (
                <tr key={l.id}>
                  <td className="mono">{l.sku}</td>
                  <td>{l.quantity}</td>
                  <td>{l.receivedQty ?? "—"}</td>
                  <td>{l.damagedQty || "—"}</td>
                  <td>
                    {diff === null ? (
                      "—"
                    ) : (
                      <span className={`tag ${diff === 0 ? "ok" : "red"}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
