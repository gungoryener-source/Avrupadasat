"use client";
import { useActionState } from "react";
import { Submit } from "@/components/Submit";
import {
  approveContentAction,
  generateContentAction,
  saveInputAction,
  type CState,
} from "./actions";

function Msg({ s }: { s: CState }) {
  if (s?.error) return <p className="alert-err">{s.error}</p>;
  if (s?.ok) return <p className="alert-ok">{s.ok}</p>;
  return null;
}

export function ContentForms(p: {
  sku: string;
  titleTr: string;
  featuresTr: string;
  titleDe: string;
  bulletsDe: string;
  descriptionDe: string;
  approved: boolean;
}) {
  const [s1, save] = useActionState(saveInputAction, undefined as CState);
  const [s2, gen] = useActionState(generateContentAction, undefined as CState);
  const [s3, approve] = useActionState(approveContentAction, undefined as CState);
  return (
    <div className="g2">
      <div className="card">
        <form action={save} className="form">
          <h2 style={{ margin: 0, fontSize: 17 }}>1. Türkçe bilgiler</h2>
          <Msg s={s1} />
          <input type="hidden" name="sku" value={p.sku} />
          <div className="field">
            <label htmlFor="titleTr">Ürün adı</label>
            <input id="titleTr" name="titleTr" defaultValue={p.titleTr} required />
          </div>
          <div className="field">
            <label htmlFor="featuresTr">
              Özellikler (her satıra bir özellik: malzeme, ölçü, bakım…)
            </label>
            <textarea id="featuresTr" name="featuresTr" rows={6} defaultValue={p.featuresTr} />
          </div>
          <Submit className="btn btn-o">Kaydet</Submit>
        </form>
        <form action={gen} style={{ marginTop: 12 }}>
          <input type="hidden" name="sku" value={p.sku} />
          <Msg s={s2} />
          <Submit pendingText="Hazırlanıyor…">2. Almanca taslak hazırla</Submit>
        </form>
      </div>
      <form action={approve} className="card form">
        <h2 style={{ margin: 0, fontSize: 17 }}>
          3. Kontrol et ve onayla {p.approved && <span className="tag ok">Onaylı</span>}
        </h2>
        <Msg s={s3} />
        <input type="hidden" name="sku" value={p.sku} />
        <div className="field">
          <label htmlFor="titleDe">Titel</label>
          <input id="titleDe" name="titleDe" defaultValue={p.titleDe} lang="de" key={p.titleDe} />
        </div>
        <div className="field">
          <label htmlFor="bulletsDe">Aufzählungspunkte (her satır bir madde)</label>
          <textarea
            id="bulletsDe"
            name="bulletsDe"
            rows={5}
            defaultValue={p.bulletsDe}
            lang="de"
            key={p.bulletsDe}
          />
        </div>
        <div className="field">
          <label htmlFor="descriptionDe">Beschreibung</label>
          <textarea
            id="descriptionDe"
            name="descriptionDe"
            rows={5}
            defaultValue={p.descriptionDe}
            lang="de"
            key={p.descriptionDe}
          />
        </div>
        <Submit>Onayla</Submit>
      </form>
    </div>
  );
}
