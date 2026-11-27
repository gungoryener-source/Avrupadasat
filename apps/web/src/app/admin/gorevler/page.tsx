import Link from "next/link";
import { can } from "@avrupadasat/core/roles";
import type { WorkStatus } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { CreateTaskForm, UpdateTaskForm } from "@/components/panel/TaskForms";
import {
  Badge,
  Card,
  EmptyState,
  Flash,
  PageHeader,
  Pager,
  Toolbar,
  WorkBadge,
  pageNum,
  sp,
} from "@/components/panel/ui";
import { IconChecklist } from "@/components/site/Icons";
import { staffOptions, tenantOptions } from "@/server/admin-data";
import { nowMs } from "@/server/clock";
import { requireStaff } from "@/server/session";
import { listStaffTasks, TASK_CATEGORIES, WORK_STATUS_LABEL } from "@/server/tasks";
import { PRIORITY_LABEL } from "@/server/tickets";

export const metadata = { title: "Görevler" };

export default async function AdminTasks({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireStaff("task.read");
  const q = sp(await searchParams);
  const write = can(s.actor.role, "task.write");
  const [staff, tenants] = await Promise.all([staffOptions(), tenantOptions(s.actor)]);
  const status =
    q.durum === "tumu"
      ? undefined
      : q.durum && q.durum in WORK_STATUS_LABEL
        ? (q.durum as WorkStatus)
        : "OPEN";
  const assigneeId =
    q.atanan === "herkes"
      ? undefined
      : staff.some((x) => x.value === q.atanan)
        ? q.atanan
        : s.actor.userId;
  const tenantId = tenants.some((t) => t.value === q.firma) ? q.firma : undefined;
  const r = await listStaffTasks({
    status,
    assigneeId,
    tenantId,
    q: q.q,
    page: pageNum(q.sayfa),
  });
  const names = Object.fromEntries(staff.map((x) => [x.value, x.label]));
  const now = nowMs();
  return (
    <>
      <PageHeader
        title="Görevler"
        desc="Varsayılan: size atanmış açık görevler. Müşteriye görünen görevlerde durum değişikliği müşteriye bildirilir."
      />
      <Flash value={q.sonuc} messages={{ gorev: "Görev güncellendi." }} />
      {write && (
        <details className="pc drawer" open={q.yeni === "1"} style={{ marginBottom: 16 }}>
          <summary>+ Yeni görev</summary>
          <CreateTaskForm tenants={tenants} staff={staff} me={s.actor.userId} />
        </details>
      )}
      <Toolbar
        q={q.q}
        placeholder="Görev başlığı"
        filters={[
          {
            name: "durum",
            label: "Durum",
            all: "Açık görevler",
            value: q.durum,
            options: [
              { value: "tumu", label: "Tüm durumlar" },
              ...Object.entries(WORK_STATUS_LABEL).map(([value, label]) => ({ value, label })),
            ],
          },
          {
            name: "atanan",
            label: "Sorumlu",
            all: "Bana atananlar",
            value: q.atanan,
            options: [{ value: "herkes", label: "Herkes" }, ...staff],
          },
          { name: "firma", label: "Firma", value: q.firma, options: tenants },
        ]}
      />
      {r.total === 0 ? (
        <div className="pc">
          <EmptyState
            icon={<IconChecklist size={20} />}
            title="Görev yok"
            text="Bu filtrelere uyan görev bulunmuyor."
          />
        </div>
      ) : (
        <div className="grid">
          {r.items.map((t) => {
            const late = t.dueAt && t.status !== "COMPLETED" && t.dueAt.getTime() < now;
            return (
              <Card
                key={t.id}
                title={
                  <>
                    {t.title}{" "}
                    <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
                      ·{" "}
                      <Link href={`/admin/musteriler/${t.tenantId}?sekme=operasyon`}>
                        {t.tenant.name}
                      </Link>
                    </span>
                  </>
                }
                action={<WorkBadge status={t.status} />}
              >
                <div className="row-actions" style={{ fontSize: 13, color: "var(--mute)" }}>
                  <span>
                    {TASK_CATEGORIES[t.category as keyof typeof TASK_CATEGORIES] ?? t.category}
                  </span>
                  <span>· {PRIORITY_LABEL[t.priority]} öncelik</span>
                  <span>· Sorumlu: {t.assigneeId ? (names[t.assigneeId] ?? "—") : "atanmadı"}</span>
                  {t.dueAt && (
                    <span>
                      · Son tarih {fmtDate(t.dueAt)} {late && <Badge tone="red">Gecikti</Badge>}
                    </span>
                  )}
                  {t.customerAction && <Badge tone="amber">Müşteriden bekleniyor</Badge>}
                  {!t.customerVisible && <Badge>Yalnız ekip</Badge>}
                </div>
                {t.description && (
                  <p style={{ margin: "10px 0 0", fontSize: 14 }}>{t.description}</p>
                )}
                {write && (
                  <details className="drawer" open={q.id === t.id} style={{ marginTop: 12 }}>
                    <summary>Güncelle</summary>
                    <UpdateTaskForm task={t} staff={staff} back="/admin/gorevler" />
                  </details>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <Pager
        page={r.page}
        pageSize={r.pageSize}
        total={r.total}
        params={{ q: q.q, durum: q.durum, atanan: q.atanan, firma: q.firma }}
      />
    </>
  );
}
