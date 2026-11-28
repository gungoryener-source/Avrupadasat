/** Ekip görev formları (oluştur / güncelle) — admin görevler sayfası ve müşteri detayı ortak kullanır */
import type { Task } from "@avrupadasat/db";
import { ActionForm, FieldError } from "@/components/panel/ActionForm";
import { Submit } from "@/components/Submit";
import { PRIORITY_LABEL } from "@/server/tickets";
import { TASK_CATEGORIES, WORK_STATUS_LABEL } from "@/server/tasks";
import { createTaskAction, taskAttachAction, updateTaskAction } from "@/app/admin/portal-actions";

type Opt = { value: string; label: string };
const ymd = (d?: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export function CreateTaskForm({
  tenants,
  staff,
  tenantId,
  me,
}: {
  tenants?: Opt[];
  staff: Opt[];
  tenantId?: string;
  me: string;
}) {
  return (
    <ActionForm action={createTaskAction}>
      {tenantId ? (
        <input type="hidden" name="tenantId" value={tenantId} />
      ) : (
        <div className="field">
          <label htmlFor="ct-tenant">Firma</label>
          <select id="ct-tenant" name="tenantId" required defaultValue="">
            <option value="" disabled>
              Seçin
            </option>
            {tenants?.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <FieldError name="tenantId" />
        </div>
      )}
      <div className="field">
        <label htmlFor="ct-title">Başlık</label>
        <input id="ct-title" name="title" required maxLength={160} />
        <FieldError name="title" />
      </div>
      <div className="field">
        <label htmlFor="ct-desc">Açıklama (müşteri görür)</label>
        <textarea id="ct-desc" name="description" rows={3} maxLength={4000} />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="ct-cat">Kategori</label>
          <select id="ct-cat" name="category" defaultValue="GENEL">
            {Object.entries(TASK_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ct-as">Sorumlu</label>
          <select id="ct-as" name="assigneeId" defaultValue={me}>
            <option value="">Atanmadı</option>
            {staff.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ct-due">Son tarih</label>
          <input id="ct-due" name="dueAt" type="date" />
        </div>
        <div className="field">
          <label htmlFor="ct-pr">Öncelik</label>
          <select id="ct-pr" name="priority" defaultValue="NORMAL">
            {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="chk">
        <input type="checkbox" name="customerVisible" defaultChecked /> Müşteri panelinde göster
      </label>
      <label className="chk">
        <input type="checkbox" name="customerAction" /> Müşteriden işlem bekleniyor
      </label>
      <div className="field">
        <label htmlFor="ct-int">İç not (müşteri görmez)</label>
        <textarea id="ct-int" name="internalNote" rows={2} maxLength={4000} />
      </div>
      <div>
        <Submit pendingText="Oluşturuluyor…">Görev oluştur</Submit>
      </div>
    </ActionForm>
  );
}

export function UpdateTaskForm({ task, staff, back }: { task: Task; staff: Opt[]; back?: string }) {
  return (
    <ActionForm action={updateTaskAction} resetOnOk={false}>
      <input type="hidden" name="id" value={task.id} />
      <input type="hidden" name="customerActionField" value="1" />
      {back && <input type="hidden" name="back" value={back} />}
      <div className="form-row">
        <div className="field">
          <label htmlFor={`st-${task.id}`}>Durum</label>
          <select id={`st-${task.id}`} name="status" defaultValue={task.status}>
            {Object.entries(WORK_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`as-${task.id}`}>Sorumlu</label>
          <select id={`as-${task.id}`} name="assigneeId" defaultValue={task.assigneeId ?? ""}>
            <option value="">Atanmadı</option>
            {staff.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`du-${task.id}`}>Son tarih</label>
          <input id={`du-${task.id}`} name="dueAt" type="date" defaultValue={ymd(task.dueAt)} />
        </div>
        <div className="field">
          <label htmlFor={`pr-${task.id}`}>Öncelik</label>
          <select id={`pr-${task.id}`} name="priority" defaultValue={task.priority}>
            {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="chk">
        <input type="checkbox" name="customerAction" defaultChecked={task.customerAction} />{" "}
        Müşteriden işlem bekleniyor
      </label>
      <div className="field">
        <label htmlFor={`cu-${task.id}`}>Müşteriye güncelleme</label>
        <textarea
          id={`cu-${task.id}`}
          name="customerUpdate"
          rows={2}
          defaultValue={task.customerUpdate ?? ""}
        />
      </div>
      <div className="field">
        <label htmlFor={`in-${task.id}`}>İç not (müşteri görmez)</label>
        <textarea
          id={`in-${task.id}`}
          name="internalNote"
          rows={3}
          defaultValue={task.internalNote ?? ""}
        />
      </div>
      <div>
        <Submit className="btn btn-o" pendingText="…">
          Güncelle
        </Submit>
      </div>
    </ActionForm>
  );
}

type Att = { id: string; filename: string; internal: boolean };

/** Görev ekleri listesi + ekip yüklemesi (iç ek seçeneğiyle) */
export function TaskAttachments({
  taskId,
  items,
  urls,
  write,
}: {
  taskId: string;
  items: Att[];
  urls: Record<string, string>;
  write: boolean;
}) {
  return (
    <div style={{ marginTop: 10 }}>
      {items.length > 0 && (
        <div className="row-actions" style={{ fontSize: 13, marginBottom: 8 }}>
          {items.map((a) => (
            <a key={a.id} href={urls[a.id]}>
              Ek: {a.filename}
              {a.internal && " (iç)"}
            </a>
          ))}
        </div>
      )}
      {write && (
        <ActionForm
          action={taskAttachAction}
          encType="multipart/form-data"
          className="form row-actions"
        >
          <input type="hidden" name="id" value={taskId} />
          <input
            name="file"
            type="file"
            required
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx,.csv"
            aria-label="Görev eki"
            style={{ height: "auto", padding: 6 }}
          />
          <label className="chk" style={{ fontSize: 13 }}>
            <input type="checkbox" name="internal" /> Yalnız ekip
          </label>
          <Submit className="btn btn-o btn-sm" pendingText="…">
            Ek yükle
          </Submit>
        </ActionForm>
      )}
    </div>
  );
}
