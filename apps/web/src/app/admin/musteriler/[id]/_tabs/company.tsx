import { can } from "@avrupadasat/core/roles";
import { forTenant } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { FilingForm, VatDeadlinesButton } from "@/components/panel/TaxForms";
import { Badge, Card, WorkBadge } from "@/components/panel/ui";
import { Submit } from "@/components/Submit";
import { nowMs } from "@/server/clock";
import { COMPANY_FORM_LABEL, getCompany, listFilings, TAX_KIND_LABEL } from "@/server/company";
import { db } from "@/server/db";
import { STEP_LABEL, STEP_STATUS } from "@/server/labels";
import { updateRegistrationAction } from "../../../ops-actions";
import { CompanyForm } from "./CompanyForm";
import type { TabCtx } from "./ctx";

export async function CompanyTab({ tenantId, actor }: TabCtx) {
  const manage = can(actor.role, "tenant.manage");
  const [c, steps, filings] = await Promise.all([
    getCompany(tenantId),
    forTenant(db(), tenantId).registrationTask.findMany({ orderBy: { step: "asc" } }),
    can(actor.role, "tax.read") ? listFilings(tenantId) : Promise.resolve([]),
  ]);
  const taxWrite = can(actor.role, "tax.write");
  const now = nowMs();
  return (
    <div className="grid grid-main">
      <div className="grid" style={{ alignContent: "start" }}>
        <Card title="Şirket profili">
          {manage ? (
            <CompanyForm c={c} />
          ) : (
            <dl className="kv">
              <dt>Unvan</dt>
              <dd>{c.legalName ?? "—"}</dd>
              <dt>Tür</dt>
              <dd>{c.companyForm ? COMPANY_FORM_LABEL[c.companyForm] : "—"}</dd>
              <dt>Sicil</dt>
              <dd>{c.registerNumber ? `${c.registerNumber} · ${c.registerCourt ?? ""}` : "—"}</dd>
              <dt>USt-IdNr.</dt>
              <dd>{c.vatId ?? "—"}</dd>
              <dt>Vergi no</dt>
              <dd>{c.taxNumber ?? "—"}</dd>
            </dl>
          )}
        </Card>
        {can(actor.role, "tax.read") && (
          <Card
            title="Vergi takvimi"
            action={taxWrite ? <VatDeadlinesButton tenantId={tenantId} /> : undefined}
          >
            {filings.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Takvimde beyan yok.
              </p>
            ) : (
              <div className="tw" style={{ border: 0 }}>
                <table className="tbl tbl-stack">
                  <thead>
                    <tr>
                      <th>Beyan</th>
                      <th>Dönem</th>
                      <th>Son tarih</th>
                      <th>Durum</th>
                      {taxWrite && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {filings.map((f) => (
                      <tr key={f.id}>
                        <td>{TAX_KIND_LABEL[f.kind] ?? f.kind}</td>
                        <td className="mono" data-l="Dönem">
                          {f.period}
                        </td>
                        <td data-l="Son tarih">
                          {fmtDate(f.dueAt)}{" "}
                          {f.status !== "COMPLETED" && f.dueAt.getTime() < now && (
                            <Badge tone="red">Geçti</Badge>
                          )}
                        </td>
                        <td data-l="Durum">
                          <WorkBadge status={f.status} />
                        </td>
                        {taxWrite && (
                          <td>
                            <details className="drawer">
                              <summary>Düzenle</summary>
                              <FilingForm tenantId={tenantId} filing={f} />
                            </details>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {taxWrite && (
              <details className="drawer" style={{ marginTop: 12 }}>
                <summary>+ Beyan ekle</summary>
                <FilingForm tenantId={tenantId} />
              </details>
            )}
          </Card>
        )}
      </div>
      <Card title="Kuruluş ve kayıt adımları">
        <ul className="ls">
          {steps.map((r) => (
            <li key={r.id} style={{ display: "block" }}>
              <div className="ls-main" style={{ marginBottom: 6 }}>
                <b>{STEP_LABEL[r.step]}</b>
                {r.updatedAt && <small>Güncellendi {fmtDate(r.updatedAt)}</small>}
              </div>
              {manage ? (
                <form action={updateRegistrationAction} className="form row-actions">
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="step" value={r.step} />
                  <select
                    name="status"
                    defaultValue={r.status}
                    aria-label={`${STEP_LABEL[r.step]} durumu`}
                  >
                    {Object.entries(STEP_STATUS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <input
                    name="note"
                    defaultValue={r.note ?? ""}
                    placeholder="Not (müşteri görür)"
                    aria-label="Not"
                    maxLength={500}
                    style={{ flex: 1, minWidth: 120 }}
                  />
                  <Submit className="btn btn-o btn-sm" pendingText="…">
                    Kaydet
                  </Submit>
                </form>
              ) : (
                <Badge>{STEP_STATUS[r.status]}</Badge>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
