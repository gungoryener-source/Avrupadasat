"use client";
import { useActionState } from "react";
import { IMPORTER_MODEL_LABEL, IMPORTER_MODELS } from "@avrupadasat/core/eu-party";
import { Submit } from "@/components/Submit";
import { saveEuPartyAction } from "./actions";

export interface EuPartyValues {
  importerModel: string;
  responsibleName: string;
  responsibleAddress: string;
  responsibleEmail: string;
  lucidNumber: string | null;
  packagingRepresentative: string | null;
  sellsElectrical: boolean;
  weeeNumber: string | null;
  weeeRepresentative: string | null;
}

export function EuPartyForm({
  initial,
  canEdit,
}: {
  initial: EuPartyValues | null;
  canEdit: boolean;
}) {
  const [state, action] = useActionState(saveEuPartyAction, undefined);
  const d = initial;
  return (
    <form action={action} className="card form">
      {state?.ok && (
        <p className="alert-ok" role="status">
          Kaydedildi.
        </p>
      )}
      {state?.error && (
        <div className="alert-err" role="alert">
          <p style={{ margin: 0 }}>{state.error}</p>
          {state.errors && (
            <ul style={{ margin: "6px 0 0" }}>
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <fieldset disabled={!canEdit} className="form" style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="field" role="radiogroup" aria-labelledby="eu-model-l">
          <label id="eu-model-l">İthalatçı modeli</label>
          {IMPORTER_MODELS.map((m) => (
            <label key={m} className="check" style={{ fontWeight: 400 }}>
              <input
                type="radio"
                name="importerModel"
                value={m}
                defaultChecked={d?.importerModel === m}
                required
                style={{ width: "auto" }}
              />
              <span>{IMPORTER_MODEL_LABEL[m]}</span>
            </label>
          ))}
        </div>
        <div className="field">
          <label htmlFor="eu-name">AB&apos;deki ürün sorumlusu (kişi veya şirket adı)</label>
          <input
            id="eu-name"
            name="responsibleName"
            defaultValue={d?.responsibleName ?? ""}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="eu-address">Sorumlunun AB&apos;deki posta adresi</label>
          <textarea
            id="eu-address"
            name="responsibleAddress"
            rows={2}
            defaultValue={d?.responsibleAddress ?? ""}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="eu-email">Sorumlunun e-posta adresi</label>
          <input
            id="eu-email"
            name="responsibleEmail"
            type="email"
            defaultValue={d?.responsibleEmail ?? ""}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="eu-lucid">
            LUCID ambalaj kayıt numarası (başvuru sürüyorsa boş bırakın)
          </label>
          <input
            id="eu-lucid"
            name="lucidNumber"
            defaultValue={d?.lucidNumber ?? ""}
            placeholder="DE…"
          />
        </div>
        <div className="field">
          <label htmlFor="eu-prep">
            Ambalaj için Almanya&apos;daki yetkili temsilci (Almanya&apos;da şirketiniz yoksa
            zorunlu)
          </label>
          <input
            id="eu-prep"
            name="packagingRepresentative"
            defaultValue={d?.packagingRepresentative ?? ""}
          />
        </div>
        <label className="check">
          <input
            name="sellsElectrical"
            type="checkbox"
            defaultChecked={d?.sellsElectrical ?? false}
            style={{ width: "auto" }}
          />
          <span>Elektrikli veya elektronik ürün satıyoruz</span>
        </label>
        <div className="field">
          <label htmlFor="eu-weee">WEEE (stiftung ear) kayıt numarası</label>
          <input
            id="eu-weee"
            name="weeeNumber"
            defaultValue={d?.weeeNumber ?? ""}
            placeholder="DE 12345678"
          />
        </div>
        <div className="field">
          <label htmlFor="eu-wrep">WEEE için Almanya&apos;daki yetkili temsilci</label>
          <input
            id="eu-wrep"
            name="weeeRepresentative"
            defaultValue={d?.weeeRepresentative ?? ""}
          />
        </div>
        {canEdit && (
          <Submit className="btn" pendingText="Kaydediliyor…">
            Kaydet
          </Submit>
        )}
      </fieldset>
    </form>
  );
}
