import { nowMs } from "@/server/clock";
import Link from "next/link";
import { forTenant } from "@avrupadasat/db";
import { formatEur } from "@avrupadasat/core/pricing";
import { STEP_LABEL } from "@avrupadasat/core/labels";
import { fmtDate } from "@/components/AppShell";
import { Badge, Card, EmptyState, PageHeader, WorkBadge } from "@/components/panel/ui";
import { IconReceipt } from "@/components/site/Icons";
import { getCompany, listFilings, TAX_KIND_LABEL } from "@/server/company";
import { db } from "@/server/db";
import { DOC_REVIEW_LABEL } from "@/server/documents";
import { signDownload } from "@/server/files";
import { INVOICE_STATUS } from "@/server/labels-ops";
import { requireClient } from "@/server/session";

export const metadata = { title: "Vergi ve Muhasebe" };

const REG_STATUS: Record<string, [string, "neutral" | "blue" | "green" | "red"]> = {
  BEKLIYOR: ["Bekliyor", "neutral"],
  SURUYOR: ["Sürüyor", "blue"],
  TAMAM: ["Tamamlandı", "green"],
  SORUN: ["İlgi gerekiyor", "red"],
};

export default async function TaxPage() {
  const s = await requireClient("tax.read");
  const tid = s.actor.tenantId;
  const t = forTenant(db(), tid);
  const [c, filings, reg, docs, invoices] = await Promise.all([
    getCompany(tid),
    listFilings(tid),
    t.registrationTask.findMany({ where: { step: { in: ["VERGI_NO", "UST_ID", "EORI"] } } }),
    t.document.findMany({
      where: { kind: { in: ["VERGI", "MUHASEBE"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    t.invoice.findMany({
      where: { status: { not: "DRAFT" } },
      orderBy: { period: "desc" },
      take: 6,
    }),
  ]);
  const upcoming = filings
    .filter((f) => f.status !== "COMPLETED")
    .sort((a, b) => +a.dueAt - +b.dueAt);
  const done = filings.filter((f) => f.status === "COMPLETED");
  return (
    <>
      <PageHeader
        title="Vergi ve Muhasebe"
        desc="KDV kaydınız, beyan takvimi, vergi belgeleri ve fatura arşiviniz."
        actions={
          <Link href="/panel/destek/yeni?kategori=VERGI" className="btn btn-o">
            Muhasebe ekibine yaz
          </Link>
        }
      />
      <div className="stats">
        <div className="st">
          <div className="st-l">KDV kimlik no</div>
          <div className="st-v" style={{ fontSize: 18 }}>
            {c.vatId ?? "—"}
          </div>
          <div className="st-h">{c.vatId ? "Kayıtlı" : "Kayıt bekleniyor"}</div>
        </div>
        <div className="st">
          <div className="st-l">Vergi numarası</div>
          <div className="st-v" style={{ fontSize: 18 }}>
            {c.taxNumber ?? "—"}
          </div>
          <div className="st-h">Maskeli gösterilir</div>
        </div>
        <div className="st">
          <div className="st-l">Yaklaşan beyan</div>
          <div className="st-v">{upcoming.length}</div>
          <div className="st-h">
            {upcoming[0] ? `İlki ${fmtDate(upcoming[0].dueAt)}` : "Planlı beyan yok"}
          </div>
        </div>
        <div className="st">
          <div className="st-l">Verilen beyan</div>
          <div className="st-v">{done.length}</div>
          <div className="st-h">Son 60 kayıt</div>
        </div>
      </div>
      <div className="grid grid-main">
        <div className="stack">
          <Card title="Beyan takvimi" pad={false}>
            {filings.length === 0 ? (
              <EmptyState
                icon={<IconReceipt size={20} />}
                title="Henüz planlı beyan yok"
                text="KDV kaydınız tamamlanınca vergi danışmanımız beyan takvimini burada paylaşır."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="tbl tbl-stack">
                  <thead>
                    <tr>
                      <th>Beyan</th>
                      <th>Dönem</th>
                      <th>Son tarih</th>
                      <th>Durum</th>
                      <th>Not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...upcoming, ...done].map((f) => (
                      <tr key={f.id}>
                        <td>{TAX_KIND_LABEL[f.kind] ?? f.kind}</td>
                        <td data-l="Dönem" className="mono">
                          {f.period}
                        </td>
                        <td data-l="Son tarih">
                          {fmtDate(f.dueAt)}
                          {f.status !== "COMPLETED" && +f.dueAt < nowMs() && (
                            <>
                              {" "}
                              <Badge tone="red">Gecikti</Badge>
                            </>
                          )}
                        </td>
                        <td>
                          <WorkBadge status={f.status} />
                        </td>
                        <td data-l="Not" className="muted">
                          {f.note ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card
            title="Fatura arşivi"
            action={<Link href="/panel/abonelik">Abonelik ve Ödemeler</Link>}
            pad={false}
          >
            {invoices.length === 0 ? (
              <EmptyState title="Fatura yok" text="Aylık hizmet faturalarınız burada arşivlenir." />
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Dönem</th>
                    <th className="num">Tutar</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <a href={`/fatura/${i.id}`}>{i.number}</a>
                      </td>
                      <td className="mono">{i.period}</td>
                      <td className="num">{formatEur(i.grossCents, { decimals: true })}</td>
                      <td>
                        <Badge
                          tone={
                            i.status === "PAID" ? "green" : i.status === "VOID" ? "red" : "amber"
                          }
                        >
                          {INVOICE_STATUS[i.status][0]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
        <div className="stack">
          <Card title="Kayıt durumu">
            <ul className="ls">
              {reg.length === 0 && <li className="muted">Kayıt adımı tanımlanmadı.</li>}
              {reg.map((r) => {
                const [l, tone] = REG_STATUS[r.status] ?? [r.status, "neutral"];
                return (
                  <li key={r.id}>
                    <div className="ls-main">
                      <b>{STEP_LABEL[r.step]}</b>
                      {r.note && <small>{r.note}</small>}
                    </div>
                    <Badge tone={tone}>{l}</Badge>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card
            title="Vergi ve muhasebe belgeleri"
            action={<Link href="/panel/belgeler?tur=VERGI">Belgelerim</Link>}
          >
            {docs.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Belge yok. Beyan dekontları ve muhasebe belgeleri burada görünür.
              </p>
            ) : (
              <ul className="ls">
                {docs.map((d) => (
                  <li key={d.id}>
                    <div className="ls-main">
                      <a href={signDownload(d.id, s.userId)}>{d.filename}</a>
                      <small>{fmtDate(d.createdAt)}</small>
                    </div>
                    <Badge
                      tone={
                        d.review === "APPROVED"
                          ? "green"
                          : d.review === "REJECTED"
                            ? "red"
                            : "amber"
                      }
                    >
                      {DOC_REVIEW_LABEL[d.review]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
            Bu takvim bilgilendirme amaçlıdır ve vergi danışmanlığı yerine geçmez. Beyanlar iş
            ortağımız vergi danışmanı (Steuerberater) tarafından verilir; kesin yükümlülükleriniz
            onun değerlendirmesiyle belirlenir.
          </p>
        </div>
      </div>
    </>
  );
}
