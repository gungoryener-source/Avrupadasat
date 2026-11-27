import { nowMs } from "@/server/clock";
import { fmtDate } from "@/components/AppShell";
import { ActionForm } from "@/components/panel/ActionForm";
import { Badge, EmptyState, PageHeader, Tabs, WorkBadge } from "@/components/panel/ui";
import { IconChecklist } from "@/components/site/Icons";
import { Submit } from "@/components/Submit";
import { requireClient } from "@/server/session";
import { listCustomerTasks, TASK_CATEGORIES } from "@/server/tasks";
import { taskDoneAction } from "../portal-actions";

export const metadata = { title: "Görevlerim" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string; bildirildi?: string }>;
}) {
  const s = await requireClient("task.read");
  const { g, bildirildi } = await searchParams;
  const done = g === "tamamlanan";
  const tasks = await listCustomerTasks(
    s.actor.tenantId,
    done ? { status: "COMPLETED" } : { status: "OPEN" },
  );
  const mine = tasks.filter((t) => t.customerAction);
  const team = tasks.filter((t) => !t.customerAction);
  const now = nowMs();
  const Item = ({ t }: { t: (typeof tasks)[number] }) => (
    <li className="task">
      <div className="ls-main">
        <b>{t.title}</b>
        <small>
          {TASK_CATEGORIES[t.category as keyof typeof TASK_CATEGORIES] ?? t.category}
          {t.dueAt ? ` · son tarih ${fmtDate(t.dueAt)}` : ""}
          {t.completedAt ? ` · tamamlandı ${fmtDate(t.completedAt)}` : ""}
        </small>
        {t.description && <p className="task-d">{t.description}</p>}
        {t.customerUpdate && <p className="task-u">{t.customerUpdate}</p>}
        {t.customerAction && t.status !== "COMPLETED" && (
          <ActionForm action={taskDoneAction} className="task-f">
            <input type="hidden" name="id" value={t.id} />
            <label className="sr-only" htmlFor={`n-${t.id}`}>
              Not (isteğe bağlı)
            </label>
            <input id={`n-${t.id}`} name="note" placeholder="Not (isteğe bağlı)" maxLength={1000} />
            <Submit className="btn btn-sm">Yaptım, ekibe bildir</Submit>
          </ActionForm>
        )}
      </div>
      <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
        <WorkBadge status={t.status} />
        {t.dueAt && t.status !== "COMPLETED" && +t.dueAt < now && <Badge tone="red">Gecikti</Badge>}
      </div>
    </li>
  );
  return (
    <>
      <PageHeader
        title="Görevlerim"
        desc="Sizden beklenen işlemler ve ekibimizin sizin için yürüttüğü adımlar."
      />
      {bildirildi && (
        <p className="alert-ok" role="status" style={{ marginBottom: 16 }}>
          Ekibe iletildi. Kontrol edildiğinde bildirim alacaksınız.
        </p>
      )}
      <Tabs
        active={done ? "done" : "open"}
        items={[
          { key: "open", label: "Açık", href: "/panel/gorevler" },
          { key: "done", label: "Tamamlanan", href: "/panel/gorevler?g=tamamlanan" },
        ]}
      />
      {tasks.length === 0 ? (
        <div className="pc">
          <EmptyState
            icon={<IconChecklist size={20} />}
            title={done ? "Tamamlanan görev yok" : "Açık görev yok"}
            text="Ekibimiz sizden bir işlem beklediğinde burada ve bildirimlerde görürsünüz."
          />
        </div>
      ) : (
        <div className="grid grid-2">
          <section className="pc">
            <header className="pc-h">
              <h2>Sizden beklenenler</h2>
              <Badge tone={mine.length ? "amber" : "neutral"}>{mine.length}</Badge>
            </header>
            {mine.length ? (
              <ul className="ls">
                {mine.map((t) => (
                  <Item key={t.id} t={t} />
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Şu an sizden beklenen bir işlem yok.
              </p>
            )}
          </section>
          <section className="pc">
            <header className="pc-h">
              <h2>Ekibimizin yürüttükleri</h2>
              <Badge>{team.length}</Badge>
            </header>
            {team.length ? (
              <ul className="ls">
                {team.map((t) => (
                  <Item key={t.id} t={t} />
                ))}
              </ul>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Kayıt yok.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
