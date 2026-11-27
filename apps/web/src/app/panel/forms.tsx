"use client";
import { useActionState } from "react";
import { Submit } from "@/components/Submit";
import {
  createAsnAction,
  importCatalogAction,
  inviteMemberAction,
  uploadDocAction,
  type PanelState,
} from "./actions";

function Result({ state }: { state: PanelState }) {
  if (!state) return null;
  return (
    <>
      {state.error && (
        <p className="alert-err" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="alert-ok" role="status">
          {state.ok}
        </p>
      )}
      {state.errors && state.errors.length > 0 && (
        <ul className="muted" style={{ fontSize: 13 }}>
          {state.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </>
  );
}

export function AsnForm() {
  const [state, action] = useActionState(createAsnAction, undefined);
  return (
    <form action={action} className="card form">
      <h2 style={{ margin: 0, fontSize: 19 }}>Yeni sevkiyat bildir (ASN)</h2>
      <Result state={state} />
      <div className="g2" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="reference">Sevkiyat referansı</label>
          <input
            id="reference"
            name="reference"
            required
            maxLength={60}
            placeholder="ör. 2026-KASIM-01"
          />
        </div>
        <div className="field">
          <label htmlFor="expectedAt">Tahmini varış</label>
          <input id="expectedAt" name="expectedAt" type="date" />
        </div>
        <div className="field">
          <label htmlFor="origin">Çıkış yeri</label>
          <input id="origin" name="origin" placeholder="ör. Bursa fabrika" />
        </div>
        <div className="field">
          <label htmlFor="carrier">Taşıyıcı</label>
          <input id="carrier" name="carrier" />
        </div>
        <div className="field">
          <label htmlFor="pallets">Palet</label>
          <input id="pallets" name="pallets" type="number" min={0} defaultValue={1} required />
        </div>
        <div className="field">
          <label htmlFor="cartons">Koli</label>
          <input id="cartons" name="cartons" type="number" min={0} defaultValue={10} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="lines">Ürünler (her satır: SKU;adet)</label>
        <textarea
          id="lines"
          name="lines"
          rows={5}
          placeholder={"HV-50x90-BEYAZ;240\nHV-70x140-GRI;120"}
        />
      </div>
      <div className="field">
        <label htmlFor="linesFile">veya CSV yükleyin (başlıklar: sku;adet)</label>
        <input id="linesFile" name="linesFile" type="file" accept=".csv,text/csv" />
      </div>
      <Submit>Sevkiyatı bildir</Submit>
    </form>
  );
}

export const DOC_OPTIONS: [string, string][] = [
  ["TICARI_FATURA", "Ticari fatura"],
  ["CEKI_LISTESI", "Çeki listesi"],
  ["ATR", "A.TR dolaşım belgesi"],
  ["CMR", "CMR"],
  ["CE_BEYAN", "CE uygunluk beyanı"],
  ["SIRKET", "Şirket belgesi"],
  ["VERGI", "Vergi belgesi"],
  ["MUHASEBE", "Muhasebe belgesi"],
  ["SOZLESME", "Sözleşme"],
  ["DIGER", "Diğer"],
];

export function UploadForm({
  shipmentId,
  defaultKind = "TICARI_FATURA",
}: {
  shipmentId?: string;
  defaultKind?: string;
}) {
  const [state, action] = useActionState(uploadDocAction, undefined);
  return (
    <form action={action} className="form">
      <Result state={state} />
      {shipmentId && <input type="hidden" name="shipmentId" value={shipmentId} />}
      <div className="inline-form">
        <div className="field">
          <label htmlFor="kind">Belge türü</label>
          <select id="kind" name="kind" defaultValue={defaultKind}>
            {DOC_OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="file">Dosya (PDF, JPG, PNG, XLSX, DOCX, CSV — en fazla 10 MB)</label>
          <input
            id="file"
            name="file"
            type="file"
            required
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx,.csv"
          />
        </div>
        {!shipmentId && (
          <div className="field">
            <label htmlFor="expiresAt">Son geçerlilik (isteğe bağlı)</label>
            <input id="expiresAt" name="expiresAt" type="date" />
          </div>
        )}
        <Submit pendingText="Yükleniyor…">Yükle</Submit>
      </div>
    </form>
  );
}

export function CatalogForm() {
  const [state, action] = useActionState(importCatalogAction, undefined);
  return (
    <form action={action} className="card form">
      <h2 style={{ margin: 0, fontSize: 19 }}>Ürün kartlarını içe aktar</h2>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        CSV başlıkları: <span className="mono">sku;ad;ean</span>. Stok miktarı depoda sayımla
        girilir.
      </p>
      <Result state={state} />
      <div className="field">
        <label htmlFor="cat-file">CSV dosyası</label>
        <input id="cat-file" name="file" type="file" accept=".csv,text/csv" />
      </div>
      <div className="field">
        <label htmlFor="cat-csv">veya yapıştırın</label>
        <textarea
          id="cat-csv"
          name="csv"
          rows={4}
          placeholder={"sku;ad;ean\nHV-50x90-BEYAZ;Havlu 50x90 beyaz;8690000000011"}
        />
      </div>
      <Submit>İçe aktar</Submit>
    </form>
  );
}

export function InviteForm() {
  const [state, action] = useActionState(inviteMemberAction, undefined);
  return (
    <form action={action} className="card form">
      <h2 style={{ margin: 0, fontSize: 19 }}>Ekip üyesi davet et</h2>
      <Result state={state} />
      <div className="inline-form">
        <div className="field">
          <label htmlFor="inv-name">Ad soyad</label>
          <input id="inv-name" name="name" required />
        </div>
        <div className="field">
          <label htmlFor="inv-email">E-posta</label>
          <input id="inv-email" name="email" type="email" required />
        </div>
        <Submit>Davet et</Submit>
      </div>
    </form>
  );
}
