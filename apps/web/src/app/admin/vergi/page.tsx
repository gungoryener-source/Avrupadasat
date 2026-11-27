import Link from "next/link";
import { can } from "@avrupadasat/core/roles";
import type { Prisma, WorkStatus } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { FilingForm } from "@/components/panel/TaxForms";
import {
  Badge,
  EmptyState,
  Flash,
  PageHeader,
  Pager,
  Stat,
  Toolbar,
  WorkBadge,
  pageNum,
  sp,
} from "@/components/panel/ui";
import { IconReceipt } from "@/components/site/Icons";
import { tenantOptions } from "@/server/admin-data";
import { nowMs } from "@/server/clock";
import { TAX_KIND_LABEL } from "@/server/company";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";
import { WORK_STATUS_LABEL } from "@/server/tasks";

export const metadata = { title: "Vergi işlemleri" };

export default async function AdminTax({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireStaff("tax.read");
  const q = sp(await searchParams);
  const write = can(s.actor.role, "tax.write");
  const tenants = await tenantOptions(s.actor);
  const page = pageNum(q.sayfa);
  const size = 30;
  const now = new Date(nowMs());
  const in14 = new Date(nowMs() + 14 * 86400_000);
  const where: Prisma.TaxFilingWhereInput = {
    ...(q.durum === "tumu"
      ? {}
      : q.durum && q.durum in WORK_STATUS_LABEL
        ? { status: q.durum as WorkStatus }
        : { status: { not: "COMPLETED" } }),
    ...(q.tur && q.tur in TAX_KIND_LABEL ? { kind: q.tur } : {}),
    ...(tenants.some((t) => t.value === q.firma) ? { tenantId: q.firma } : {}),
    ...(q.q ? { period: { contains: q.q } } : {}),
  };
  const [items, total, overdue, soon, attention] = await Promise.all([
    db().taxFiling.findMany({
      where,
      include: { tenant: { select: { name: true } } },
      orderBy: { dueAt: "asc" },
      take: size,
      skip: (page - 1) * size,
    }),
    db().taxFiling.count({ where }),
    db().taxFiling.count({ where: { status: { not: "COMPLETED" }, dueAt: { lt: now } } }),
    db().taxFiling.count({
      where: { status: { not: "COMPLETED" }, dueAt: { gte: now, lte: in14 } },
    }),
    db().taxFiling.count({ where: { status: "ATTENTION" } }),
  ]);
  return (
    <>
      <PageHeader
        title="Vergi işlemleri"
        desc="Beyan takvimi bilgilendirme ve takip içindir; beyanları iş ortağı vergi danışmanı (Steuerberater) verir."
      />
      <div className="stats" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))" }}>
        <Stat label="Süresi geçmiş" value={overdue} />
        <Stat label="14 gün içinde" value={soon} />
        <Stat label="İlgi gerekiyor" value={attention} />
      </div>
      <Flash value={q.sonuc} messages={{ beyan: "Beyan güncellendi." }} />
      {write && (
        <details className="pc drawer" style={{ marginBottom: 16 }}>
          <summary>+ Beyan ekle</summary>
          <FilingForm tenants={tenants} />
        </details>
      )}
      <Toolbar
        q={q.q}
        placeholder="Dönem (ör. 2026-11)"
        filters={[
          {
            name: "durum",
            label: "Durum",
            all: "Tamamlanmamışlar",
            value: q.durum,
            options: [
              { value: "tumu", label: "Tüm durumlar" },
              ...Object.entries(WORK_STATUS_LABEL).map(([value, label]) => ({ value, label })),
            ],
          },
          {
            name: "tur",
            label: "Tür",
            value: q.tur,
            options: Object.entries(TAX_KIND_LABEL).map(([value, label]) => ({ value, label })),
          },
          { name: "firma", label: "Firma", value: q.firma, options: tenants },
        ]}
      />
      {total === 0 ? (
        <div className="pc">
          <EmptyState
            icon={<IconReceipt size={20} />}
            title="Kayıt yok"
            text="Firma detayındaki Vergi bölümünden veya “Beyan ekle” ile takvim oluşturun."
          />
        </div>
      ) : (
        <div className="tw">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th>Firma</th>
                <th>Beyan</th>
                <th>Dönem</th>
                <th>Son tarih</th>
                <th>Durum</th>
                {write && <th>Güncelle</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((f) => (
                <tr key={f.id}>
                  <td>
                    <Link href={`/admin/musteriler/${f.tenantId}?sekme=sirket`}>
                      {f.tenant.name}
                    </Link>
                  </td>
                  <td data-l="Beyan">{TAX_KIND_LABEL[f.kind] ?? f.kind}</td>
                  <td data-l="Dönem" className="mono">
                    {f.period}
                  </td>
                  <td data-l="Son tarih">
                    {fmtDate(f.dueAt)}{" "}
                    {f.status !== "COMPLETED" && f.dueAt < now && <Badge tone="red">Geçti</Badge>}
                  </td>
                  <td>
                    <WorkBadge status={f.status} />
                    {f.note && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {f.note}
                      </div>
                    )}
                  </td>
                  {write && (
                    <td data-l="Güncelle">
                      <details className="drawer">
                        <summary>Düzenle</summary>
                        <FilingForm tenantId={f.tenantId} filing={f} back="/admin/vergi" />
                      </details>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager
        page={page}
        pageSize={size}
        total={total}
        params={{ q: q.q, durum: q.durum, tur: q.tur, firma: q.firma }}
      />
    </>
  );
}
