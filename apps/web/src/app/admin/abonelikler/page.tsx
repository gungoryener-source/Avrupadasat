import Link from "next/link";
import { can } from "@avrupadasat/core/roles";
import { formatEur, packages } from "@avrupadasat/core/pricing";
import type { Prisma } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { PackageForm } from "@/components/panel/PackageForm";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Pager,
  Stat,
  Toolbar,
  pageNum,
  sp,
} from "@/components/panel/ui";
import { IconCard } from "@/components/site/Icons";
import { db } from "@/server/db";
import { PACKAGE_LABEL, TENANT_STATUS } from "@/server/labels";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Abonelikler" };

export default async function Subscriptions({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireStaff("invoice.read");
  const q = sp(await searchParams);
  const manage = can(s.actor.role, "subscription.manage");
  const page = pageNum(q.sayfa);
  const size = 25;
  const where: Prisma.TenantWhereInput = {
    ...(q.paket === "yok"
      ? { packageCode: null }
      : q.paket && q.paket in PACKAGE_LABEL
        ? { packageCode: q.paket as keyof typeof PACKAGE_LABEL }
        : {}),
    ...(q.q ? { name: { contains: q.q, mode: "insensitive" } } : {}),
  };
  const [tenants, total, counts, requests] = await Promise.all([
    db().tenant.findMany({
      where,
      orderBy: { name: "asc" },
      take: size,
      skip: (page - 1) * size,
      include: {
        contracts: { orderBy: { signedAt: "desc" }, take: 1 },
        invoices: { orderBy: { period: "desc" }, take: 1 },
      },
    }),
    db().tenant.count({ where }),
    db().tenant.groupBy({
      by: ["packageCode"],
      _count: true,
      where: { status: { not: "CLOSED" } },
    }),
    db().ticket.findMany({
      where: {
        category: "FATURA",
        subject: { startsWith: "Paket değişikliği" },
        status: { in: ["OPEN", "WAITING_TEAM", "WAITING_CUSTOMER"] },
      },
      include: { tenant: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
  ]);
  const count = (k: string | null) => counts.find((c) => c.packageCode === k)?._count ?? 0;
  return (
    <>
      <PageHeader
        title="Abonelikler"
        desc="Paket kayıtları. Bu ekranda ödeme alınmaz; ücretler aylık faturaya yansır (banka havalesi)."
      />
      <div className="stats" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
        {(Object.keys(packages) as (keyof typeof packages)[]).map((k) => (
          <Stat key={k} label={packages[k].name} value={count(k)} hint="açık firma" />
        ))}
        <Stat label="Paket yok" value={count(null)} hint="açık firma" />
      </div>
      {requests.length > 0 && (
        <Card title={`Bekleyen paket değişikliği talepleri (${requests.length})`}>
          <ul className="ls">
            {requests.map((r) => (
              <li key={r.id}>
                <div className="ls-main">
                  <Link href={`/admin/destek/${r.id}`}>
                    #{r.number} {r.subject}
                  </Link>
                  <small>
                    {r.tenant.name} · {fmtDate(r.createdAt, true)}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div style={{ height: 16 }} />
      <Toolbar
        q={q.q}
        placeholder="Firma adı"
        filters={[
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
        <Card>
          <EmptyState
            icon={<IconCard size={20} />}
            title="Firma yok"
            text="Filtreleri değiştirin."
          />
        </Card>
      ) : (
        <div className="tw">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th>Firma</th>
                <th>Durum</th>
                <th>Paket</th>
                <th>Sözleşme</th>
                <th>Son fatura</th>
                {manage && <th>Paket değiştir</th>}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const inv = t.invoices[0];
                const c = t.contracts[0];
                return (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/admin/musteriler/${t.id}?sekme=fatura`}>{t.name}</Link>
                    </td>
                    <td data-l="Durum">{TENANT_STATUS[t.status]}</td>
                    <td data-l="Paket">
                      {t.packageCode ? (
                        PACKAGE_LABEL[t.packageCode]
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td data-l="Sözleşme">
                      {c ? (
                        `${fmtDate(c.signedAt)} · ${c.signerName}`
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td data-l="Son fatura">
                      {inv ? (
                        <>
                          {inv.period} · {formatEur(inv.grossCents, { decimals: true })}{" "}
                          <Badge
                            tone={
                              inv.status === "PAID"
                                ? "green"
                                : inv.status === "ISSUED"
                                  ? "amber"
                                  : "neutral"
                            }
                          >
                            {inv.status === "PAID"
                              ? "Ödendi"
                              : inv.status === "ISSUED"
                                ? "Ödeme bekliyor"
                                : inv.status === "VOID"
                                  ? "İptal"
                                  : "Taslak"}
                          </Badge>
                        </>
                      ) : (
                        <span className="muted">Henüz yok</span>
                      )}
                    </td>
                    {manage && (
                      <td data-l="Paket değiştir">
                        <PackageForm tenantId={t.id} current={t.packageCode} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pageSize={size} total={total} params={{ q: q.q, paket: q.paket }} />
    </>
  );
}
