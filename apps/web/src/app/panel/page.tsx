import Link from "next/link";
import { formatEur } from "@avrupadasat/core/pricing";
import { SLA_TARGETS, type SlaMetric } from "@avrupadasat/core/sla";
import { CHANNEL_LABEL } from "@/server/labels-ops";
import { DOC_KIND_LABEL } from "@/server/documents";
import { overview, waitingList } from "@/server/panel";
import { requireClient } from "@/server/session";
import { slaSummary } from "@/server/sla";

function SlaRow({
  label,
  target,
  m,
  unit,
}: {
  label: string;
  target: string;
  m: SlaMetric;
  unit?: string;
}) {
  const ok = m.pct === null || m.pct >= SLA_TARGETS.onTimeTargetPct;
  return (
    <tr>
      <td>{label}</td>
      <td className="muted">{target}</td>
      <td>
        {m.count === 0 ? (
          <span className="muted">Kayıt yok</span>
        ) : (
          <span className={`tag ${ok ? "ok" : "warn"}`}>%{m.pct}</span>
        )}
      </td>
      <td className="muted">
        {m.count ? `${m.met}/${m.count}` : "–"}
        {m.avgDays !== null && unit ? ` · ort. ${m.avgDays} ${unit}` : ""}
      </td>
    </tr>
  );
}

export default async function PanelHome() {
  const s = await requireClient();
  const [o, waiting, sla] = await Promise.all([
    overview(s.actor.tenantId),
    waitingList(s.actor.tenantId),
    slaSummary(s.actor.tenantId),
  ]);
  return (
    <>
      <h1>Hoş geldiniz, {s.name.split(" ")[0]}</h1>
      {o.salesLocked && (
        <div className="note" style={{ marginBottom: 18 }}>
          <b>Satış ve ödeme adımları vergi kayıtları tamamlanınca açılacak.</b> Bu arada aşağıdaki
          hazırlıkları yapabilirsiniz. <Link href="/panel/sirket">Kayıt durumunu gör →</Link>
        </div>
      )}
      <div className="kpis">
        <div className="card kpi">
          <div className="l">Son {o.sales.days} gün ciro</div>
          <div className="v">{formatEur(o.sales.revenueCents)}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {o.sales.orders} sipariş
            {o.sales.changePct !== null && (
              <span
                style={{ color: o.sales.changePct >= 0 ? "var(--ok)" : "var(--p)", marginLeft: 6 }}
              >
                {o.sales.changePct >= 0 ? "▲" : "▼"} %{Math.abs(o.sales.changePct)}
              </span>
            )}
          </div>
          {o.sales.byChannel.length > 1 && (
            <div className="muted" style={{ fontSize: 12 }}>
              {o.sales.byChannel
                .map((c) => `${CHANNEL_LABEL[c.channel]} ${formatEur(c.revenueCents)}`)
                .join(" · ")}
            </div>
          )}
        </div>
        <div className="card kpi">
          <div className="l">Depodaki ürün</div>
          <div className="v">{o.units.toLocaleString("de-DE")}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {o.skus} SKU
          </div>
        </div>
        <div className="card kpi">
          <div className="l">Yoldaki sevkiyat</div>
          <div className="v">{o.activeShipments}</div>
        </div>
        <div className="card kpi">
          <div className="l">Bekleyen kayıt adımı</div>
          <div className="v">{o.pendingSteps}</div>
        </div>
        <div className="card kpi">
          <div className="l">Eksik belgeli sevkiyat</div>
          <div className="v" style={o.missingDocs.length ? { color: "var(--p)" } : undefined}>
            {o.missingDocs.length}
          </div>
        </div>
      </div>
      <div className="g2">
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 19 }}>Bu arada hazırlayabilecekleriniz</h2>
          <ul className="checklist">
            {waiting.map((w) => (
              <li key={w.id}>
                <span className={`tag ${w.done ? "ok" : "warn"}`}>
                  {w.done ? "Tamam" : "Yapılacak"}
                </span>{" "}
                <Link href={w.href}>{w.title}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 19 }}>Uyarılar</h2>
          {o.missingDocs.length === 0 && o.lowStock.length === 0 && (
            <p className="muted">Şu an uyarı yok.</p>
          )}
          {o.missingDocs.map((m) => (
            <p key={m.id} style={{ fontSize: 14 }}>
              <span className="tag red">Eksik belge</span>{" "}
              <Link href={`/panel/sevkiyatlar/${m.id}`}>{m.reference}</Link>:{" "}
              {m.missing.map((k) => DOC_KIND_LABEL[k]).join(", ")}
            </p>
          ))}
          {o.lowStock.map((i) => (
            <p key={i.id} style={{ fontSize: 14 }}>
              <span className="tag warn">Düşük stok</span> {i.name} ({i.sku}): {i.quantity}
            </p>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginTop: 22 }}>
        <h2 style={{ marginTop: 0, fontSize: 19 }}>Hizmet seviyesi (son {sla.days} gün)</h2>
        <table className="tbl">
          <thead>
            <tr>
              <th>Ölçü</th>
              <th>Hedef</th>
              <th>Hedefte</th>
              <th>Ayrıntı</th>
            </tr>
          </thead>
          <tbody>
            <SlaRow
              label="Gümrükten mal kabule"
              target={`En fazla ${SLA_TARGETS.inboundBusinessDays} iş günü`}
              m={sla.inbound}
              unit="iş günü"
            />
            <SlaRow
              label="Zamanında gönderim"
              target={`${SLA_TARGETS.cutoffHour}:00'e kadar gelen sipariş aynı iş günü`}
              m={sla.onTimeShipping}
              unit="iş günü"
            />
            <SlaRow
              label="İade işleme"
              target={`En fazla ${SLA_TARGETS.returnsBusinessDays} iş günü`}
              m={sla.returns}
              unit="iş günü"
            />
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
          Saatler depo saatine (Almanya) göre; hafta sonları iş günü sayılmaz.
        </p>
      </div>
    </>
  );
}
