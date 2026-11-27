import { can } from "@avrupadasat/core/roles";
import type { WorkStatus } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { CreateTaskForm, UpdateTaskForm } from "@/components/panel/TaskForms";
import { Badge, Card, EmptyState, Flash, Toolbar, WorkBadge } from "@/components/panel/ui";
import { staffOptions } from "@/server/admin-data";
import { listStaffTasks, TASK_CATEGORIES, WORK_STATUS_LABEL } from "@/server/tasks";
import type { TabCtx } from "./ctx";

export async function OperationsTab({ tenantId, actor, q }: TabCtx) {
  const write = can(actor.role, "task.write");
  const status =
    q.durum === "tumu"
      ? undefined
      : q.durum && q.durum in WORK_STATUS_LABEL
        ? (q.durum as WorkStatus)
        : "OPEN";
  const [staff, r] = await Promise.all([
    staffOptions(),
    listStaffTasks({ tenantId, status, pageSize: 100 }),
  ]);
  const names = Object.fromEntries(staff.map((x) => [x.value, x.label]));
  return (
    <div className="grid grid-main">
      <div>
        <Flash value={q.sonuc} messages={{ gorev: "Görev güncellendi." }} />
        <Toolbar
          search={false}
          keep={{ sekme: "operasyon" }}
          filters={[
            {
              name: "durum",
              label: "Durum",
              all: "Açık görevler",
              value: q.durum,
              options: [
                { value: "tumu", label: "Tümü" },
                ...Object.entries(WORK_STATUS_LABEL).map(([value, label]) => ({ value, label })),
              ],
            },
          ]}
        />
        {r.items.length === 0 ? (
          <Card>
            <EmptyState title="Görev yok" text="Bu firma için açık görev bulunmuyor." />
          </Card>
        ) : (
          <div className="grid">
            {r.items.map((t) => (
              <Card key={t.id} title={t.title} action={<WorkBadge status={t.status} />}>
                <div className="row-actions" style={{ fontSize: 13, color: "var(--mute)" }}>
                  <span>
                    {TASK_CATEGORIES[t.category as keyof typeof TASK_CATEGORIES] ?? t.category}
                  </span>
                  <span>· Sorumlu: {t.assigneeId ? (names[t.assigneeId] ?? "—") : "atanmadı"}</span>
                  {t.dueAt && <span>· Son tarih {fmtDate(t.dueAt)}</span>}
                  {t.customerAction && <Badge tone="amber">Müşteriden bekleniyor</Badge>}
                  {!t.customerVisible && <Badge>Yalnız ekip</Badge>}
                </div>
                {t.internalNote && (
                  <p
                    className="msg-int"
                    style={{
                      fontSize: 13,
                      padding: "8px 10px",
                      borderRadius: 8,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <b>İç not:</b> {t.internalNote}
                  </p>
                )}
                {write && (
                  <details className="drawer" style={{ marginTop: 10 }}>
                    <summary>Güncelle</summary>
                    <UpdateTaskForm
                      task={t}
                      staff={staff}
                      back={`/admin/musteriler/${tenantId}?sekme=operasyon`}
                    />
                  </details>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
      {write && (
        <Card title="Yeni görev">
          <CreateTaskForm staff={staff} tenantId={tenantId} me={actor.userId} />
        </Card>
      )}
    </div>
  );
}
