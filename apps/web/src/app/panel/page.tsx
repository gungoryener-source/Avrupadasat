import Link from "next/link";
import { DOC_KIND_LABEL } from "@/server/documents";
import { overview, waitingList } from "@/server/panel";
import { requireClient } from "@/server/session";

export default async function PanelHome() {
  const s = await requireClient();
  const [o, waiting] = await Promise.all([
    overview(s.actor.tenantId),
    waitingList(s.actor.tenantId),
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
    </>
  );
}
