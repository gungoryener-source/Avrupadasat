/** Ekip belge formları: onay/ret ve ekip yüklemesi (doğrudan onaylı) */
import { ActionForm } from "@/components/panel/ActionForm";
import { Submit } from "@/components/Submit";
import { DOC_KIND_LABEL } from "@/server/documents";
import { reviewDocAction, staffUploadDocAction } from "@/app/admin/portal-actions";

const ymd = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export function ReviewForm({
  id,
  expiresAt,
  back,
}: {
  id: string;
  expiresAt?: Date | null;
  back: string;
}) {
  return (
    <div className="grid" style={{ gap: 10 }}>
      <ActionForm action={reviewDocAction} className="form row-actions" resetOnOk={false}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="back" value={back} />
        <input type="hidden" name="decision" value="APPROVED" />
        <label className="field" style={{ margin: 0 }}>
          <span className="sr-only">Son geçerlilik</span>
          <input
            name="expiresAt"
            type="date"
            defaultValue={ymd(expiresAt)}
            aria-label="Son geçerlilik (isteğe bağlı)"
            title="Son geçerlilik (isteğe bağlı)"
          />
        </label>
        <Submit className="btn btn-sm" pendingText="…">
          Onayla
        </Submit>
      </ActionForm>
      <ActionForm action={reviewDocAction} className="form row-actions" resetOnOk={false}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="back" value={back} />
        <input type="hidden" name="decision" value="REJECTED" />
        <label className="field" style={{ margin: 0, flex: 1, minWidth: 180 }}>
          <span className="sr-only">Ret nedeni</span>
          <input name="note" placeholder="Ret nedeni (müşteri görür)" maxLength={500} />
        </label>
        <Submit className="btn btn-o btn-sm" pendingText="…">
          Reddet
        </Submit>
      </ActionForm>
    </div>
  );
}

export function StaffUploadForm({ tenantId }: { tenantId: string }) {
  return (
    <ActionForm action={staffUploadDocAction} encType="multipart/form-data">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div className="form-row">
        <div className="field">
          <label htmlFor="su-kind">Belge türü</label>
          <select id="su-kind" name="kind" defaultValue="SIRKET">
            {Object.entries(DOC_KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="su-exp">Son geçerlilik</label>
          <input id="su-exp" name="expiresAt" type="date" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="su-file">Dosya (PDF, PNG, JPG, XLSX, DOCX, CSV · en çok 10 MB)</label>
        <input
          id="su-file"
          name="file"
          type="file"
          required
          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx,.csv"
        />
      </div>
      <div>
        <Submit pendingText="Yükleniyor…">Yükle (onaylı)</Submit>
      </div>
    </ActionForm>
  );
}
