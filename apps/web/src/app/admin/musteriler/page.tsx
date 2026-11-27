import Link from "next/link";
import type { Prisma, TenantStatus } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import {
  Badge,
  EmptyState,
  PageHeader,
  Pager,
  SortTh,
  Toolbar,
  pageNum,
  sp,
} from "@/components/panel/ui";
import { IconUsers } from "@/components/site/Icons";
import { db } from "@/server/db";
import { PACKAGE_LABEL, TENANT_STATUS } from "@/server/labels";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Müşteriler" };

const ORDER: Record<string, Prisma.TenantOrderByWithRelationInput> = {
  ad: { name: "asc" },
  "-ad": { name: "desc" },
  tarih: { createdAt: "asc" },
  "-tarih": { createdAt: "desc" },
};

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireStaff("tenant.read");
  const q = sp(await searchParams);
  const page = pageNum(q.sayfa);
  const size = 25;
  const where: Prisma.TenantWhereInput = {
    ...(s.actor.role === "PARTNER" ? { id: { in: [...(s.actor.partnerTenantIds ?? [])] } } : {}),
    ...(q.durum && q.durum in TENANT_STATUS ? { status: q.durum as TenantStatus } : {}),
    ...(q.paket === "yok"
      ? { packageCode: null }
      : q.paket && q.paket in PACKAGE_LABEL
        ? { packageCode: q.paket as keyof typeof PACKAGE_LABEL }
        : {}),
    ...(q.q
      ? {
          OR: [
            { name: { contains: q.q, mode: "insensitive" } },
            { legalName: { contains: q.q, mode: "insensitive" } },
            { city: { contains: q.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [tenants, total] = await Promise.all([
    db().tenant.findMany({
      where,
      orderBy: ORDER[q.sirala ?? ""] ?? { createdAt: "desc" },
      take: size,
      skip: (page - 1) * size,
      include: {
        registration: { select: { status: true } },
        _count: {
          select: {
            shipments: true,
            tickets: { where: { status: { in: ["OPEN", "WAITING_TEAM"] } } },
            tasks: { where: { status: { not: "COMPLETED" } } },
          },
        },
      },
    }),
    db().tenant.count({ where }),
  ]);
  const params = { q: q.q, durum: q.durum, paket: q.paket, sirala: q.sirala };
  return (
    <>
      <PageHeader title="Müşteriler" desc={`${total} firma`} />
      <Toolbar
        q={q.q}
        placeholder="Firma adı, unvan veya şehir"
        keep={{ sirala: q.sirala }}
        filters={[
          {
            name: "durum",
            label: "Durum",
            value: q.durum,
            options: Object.entries(TENANT_STATUS).map(([value, label]) => ({ value, label })),
          },
          {
            name: "paket",
            label: "Paket",
            value: q.paket,
            options: [
              ...Object.entries(PACKAGE_LABEL).map(([value, label]) => ({ value, label })),
              { value: "yok", label: "Paket yok" },
            ],
          },
        ]}
      />
      {total === 0 ? (
        <div className="pc">
          <EmptyState
            icon={<IconUsers size={20} />}
            title="Firma bulunamadı"
            text={
              q.q || q.durum || q.paket
                ? "Filtreleri değiştirip tekrar deneyin."
                : "Bir teklif kabul edildiğinde firma hesabı otomatik açılır."
            }
          />
        </div>
      ) : (
        <div className="tw">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <SortTh label="Firma" field="ad" sort={q.sirala} params={params} />
                <th>Paket</th>
                <th>Durum</th>
                <th>Kuruluş</th>
                <th>Açık görev</th>
                <th>Açık destek</th>
                <SortTh label="Başlangıç" field="tarih" sort={q.sirala} params={params} />
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const done = t.registration.filter((r) => r.status === "TAMAM").length;
                const issue = t.registration.some((r) => r.status === "SORUN");
                return (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/admin/musteriler/${t.id}`}>{t.name}</Link>
                      {t.city && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {t.city}
                        </div>
                      )}
                    </td>
                    <td data-l="Paket">
                      {t.packageCode
                        ? PACKAGE_LABEL[t.packageCode as keyof typeof PACKAGE_LABEL]
                        : "—"}
                    </td>
                    <td data-l="Durum">
                      <Badge
                        tone={
                          t.status === "ACTIVE"
                            ? "green"
                            : t.status === "ONBOARDING"
                              ? "blue"
                              : "neutral"
                        }
                      >
                        {TENANT_STATUS[t.status]}
                      </Badge>
                    </td>
                    <td data-l="Kuruluş">
                      {t.registration.length ? `${done}/${t.registration.length}` : "—"}{" "}
                      {issue && <Badge tone="red">Sorun</Badge>}
                    </td>
                    <td data-l="Açık görev">{t._count.tasks}</td>
                    <td data-l="Açık destek">{t._count.tickets}</td>
                    <td data-l="Başlangıç">{fmtDate(t.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pageSize={size} total={total} params={params} />
    </>
  );
}
