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
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }} className="stack">
        <div className="field">
          <span id="model-l">İthalatçı modeli</span>
          {IMPORTER_MODELS.map((m) => (
            <label key={m} className="check">
              <input
                type="radio"
                name="importerModel"
                value={m}
                defaultChecked={d?.importerModel === m}
                required
              />
              <span>{IMPORTER_MODEL_LABEL[m]}</span>
            </label>
          ))}
        </div>
        <label>
          AB&apos;deki ürün sorumlusu (kişi veya şirket adı)
          <input name="responsibleName" defaultValue={d?.responsibleName ?? ""} required />
        </label>
        <label>
          Sorumlunun AB&apos;deki posta adresi
          <textarea
            name="responsibleAddress"
            rows={2}
            defaultValue={d?.responsibleAddress ?? ""}
            required
          />
        </label>
        <label>
          Sorumlunun e-posta adresi
          <input
            name="responsibleEmail"
            type="email"
            defaultValue={d?.responsibleEmail ?? ""}
            required
          />
        </label>
        <label>
          LUCID ambalaj kayıt numarası (başvuru sürüyorsa boş bırakın)
          <input name="lucidNumber" defaultValue={d?.lucidNumber ?? ""} placeholder="DE…" />
        </label>
        <label>
          Ambalaj için Almanya&apos;daki yetkili temsilci (Almanya&apos;da şirketiniz yoksa zorunlu)
          <input name="packagingRepresentative" defaultValue={d?.packagingRepresentative ?? ""} />
        </label>
        <label className="check">
          <input
            name="sellsElectrical"
            type="checkbox"
            defaultChecked={d?.sellsElectrical ?? false}
          />
          <span>Elektrikli veya elektronik ürün satıyoruz</span>
        </label>
        <label>
          WEEE (stiftung ear) kayıt numarası
          <input name="weeeNumber" defaultValue={d?.weeeNumber ?? ""} placeholder="DE 12345678" />
        </label>
        <label>
          WEEE için Almanya&apos;daki yetkili temsilci
          <input name="weeeRepresentative" defaultValue={d?.weeeRepresentative ?? ""} />
        </label>
        {canEdit && (
          <Submit className="btn" pendingText="Kaydediliyor…">
            Kaydet
          </Submit>
        )}
      </fieldset>
    </form>
  );
}
