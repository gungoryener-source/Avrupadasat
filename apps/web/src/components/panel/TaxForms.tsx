/** Ekip vergi takvimi formları */
import type { TaxFiling } from "@avrupadasat/db";
import { ActionForm, FieldError } from "@/components/panel/ActionForm";
import { Submit } from "@/components/Submit";
import { TAX_KIND_LABEL } from "@/server/company";
import { WORK_STATUS_LABEL } from "@/server/tasks";
import { addVatDeadlinesAction, upsertFilingAction } from "@/app/admin/portal-actions";

type Opt = { value: string; label: string };
const ymd = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export function FilingForm({
  tenantId,
  tenants,
  filing,
  back,
}: {
  tenantId?: string;
  tenants?: Opt[];
  filing?: TaxFiling;
  back?: string;
}) {
  const p = filing?.id ?? "new";
  return (
    <ActionForm action={upsertFilingAction} resetOnOk={!filing}>
      {back && <input type="hidden" name="back" value={back} />}
      {tenantId ? (
        <input type="hidden" name="tenantId" value={tenantId} />
      ) : (
        <div className="field">
          <label htmlFor={`f-t-${p}`}>Firma</label>
          <select id={`f-t-${p}`} name="tenantId" required defaultValue="">
            <option value="" disabled>
              Seçin
            </option>
            {tenants?.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {filing ? (
        <>
          <input type="hidden" name="kind" value={filing.kind} />
          <input type="hidden" name="period" value={filing.period} />
        </>
      ) : (
        <div className="form-row">
          <div className="field">
            <label htmlFor={`f-k-${p}`}>Tür</label>
            <select id={`f-k-${p}`} name="kind" defaultValue="UST_VA">
              {Object.entries(TAX_KIND_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`f-p-${p}`}>Dönem</label>
            <input id={`f-p-${p}`} name="period" placeholder="2026-11" required />
            <FieldError name="period" />
          </div>
        </div>
      )}
      <div className="form-row">
        <div className="field">
          <label htmlFor={`f-d-${p}`}>Son tarih</label>
          <input
            id={`f-d-${p}`}
            name="dueAt"
            type="date"
            required
            defaultValue={ymd(filing?.dueAt)}
          />
          <FieldError name="dueAt" />
        </div>
        <div className="field">
          <label htmlFor={`f-s-${p}`}>Durum</label>
          <select id={`f-s-${p}`} name="status" defaultValue={filing?.status ?? "PENDING"}>
            {Object.entries(WORK_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor={`f-n-${p}`}>Not (müşteri görür)</label>
        <input id={`f-n-${p}`} name="note" maxLength={1000} defaultValue={filing?.note ?? ""} />
      </div>
      <div>
        <Submit className={filing ? "btn btn-o btn-sm" : "btn"} pendingText="…">
          {filing ? "Kaydet" : "Beyan ekle"}
        </Submit>
      </div>
    </ActionForm>
  );
}

export function VatDeadlinesButton({ tenantId }: { tenantId: string }) {
  return (
    <ActionForm action={addVatDeadlinesAction} className="form" resetOnOk={false}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <div>
        <Submit className="btn btn-o btn-sm" pendingText="…">
          Önümüzdeki 3 ayın KDV ön beyanlarını ekle
        </Submit>
      </div>
    </ActionForm>
  );
}
