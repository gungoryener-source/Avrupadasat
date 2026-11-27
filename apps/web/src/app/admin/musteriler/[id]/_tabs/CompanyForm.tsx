import type { getCompany } from "@/server/company";
import { COMPANY_FORM_LABEL } from "@/server/company";
import { ActionForm, FieldError } from "@/components/panel/ActionForm";
import { Submit } from "@/components/Submit";
import { updateCompanyAction } from "../../../portal-actions";

type Company = Awaited<ReturnType<typeof getCompany>>;
const ymd = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export function CompanyForm({ c }: { c: Company }) {
  const reps = [
    ...c.representatives,
    ...Array(Math.max(0, 2 - c.representatives.length)).fill({ name: "", role: "" }),
  ].slice(0, 4);
  return (
    <ActionForm action={updateCompanyAction} resetOnOk={false}>
      <input type="hidden" name="tenantId" value={c.id} />
      <div className="field">
        <label htmlFor="c-legal">Ticari unvan</label>
        <input id="c-legal" name="legalName" defaultValue={c.legalName ?? ""} maxLength={200} />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="c-form">Şirket türü</label>
          <select id="c-form" name="companyForm" defaultValue={c.companyForm ?? ""}>
            <option value="">Belirtilmedi</option>
            {Object.entries(COMPANY_FORM_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="c-reg">Sicil no (HRB/HRA)</label>
          <input
            id="c-reg"
            name="registerNumber"
            defaultValue={c.registerNumber ?? ""}
            maxLength={40}
          />
        </div>
        <div className="field">
          <label htmlFor="c-court">Sicil mahkemesi</label>
          <input
            id="c-court"
            name="registerCourt"
            defaultValue={c.registerCourt ?? ""}
            maxLength={80}
          />
        </div>
        <div className="field">
          <label htmlFor="c-date">Kayıt tarihi</label>
          <input id="c-date" name="registeredAt" type="date" defaultValue={ymd(c.registeredAt)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="c-addr">İşletme adresi</label>
        <input
          id="c-addr"
          name="businessAddress"
          defaultValue={c.businessAddress ?? ""}
          maxLength={300}
        />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="c-vat">USt-IdNr.</label>
          <input id="c-vat" name="vatId" defaultValue={c.vatId ?? ""} placeholder="DE123456789" />
          <FieldError name="vatId" />
        </div>
        <div className="field">
          <label htmlFor="c-tax">Vergi no (Steuernummer)</label>
          <input
            id="c-tax"
            name="taxNumber"
            placeholder={
              c.taxNumber ? `Kayıtlı: ${c.taxNumber} — değiştirmek için yazın` : "Henüz yok"
            }
            maxLength={30}
            autoComplete="off"
          />
        </div>
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend>Yetkili temsilciler (Geschäftsführer)</legend>
        {reps.map((r, i) => (
          <div className="form-row" key={i}>
            <input
              name={`rep${i}name`}
              defaultValue={r.name}
              placeholder="Ad soyad"
              aria-label={`Temsilci ${i + 1} adı`}
            />
            <input
              name={`rep${i}role`}
              defaultValue={r.role}
              placeholder="Görev"
              aria-label={`Temsilci ${i + 1} görevi`}
            />
          </div>
        ))}
      </fieldset>
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>
        Vergi numarası şifreli saklanır ve maskeli gösterilir. Değişiklikler denetim kaydına yazılır
        (değerler yazılmaz).
      </p>
      <div>
        <Submit pendingText="Kaydediliyor…">Şirket bilgilerini kaydet</Submit>
      </div>
    </ActionForm>
  );
}
