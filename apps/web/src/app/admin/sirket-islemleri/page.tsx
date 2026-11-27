import Link from "next/link";
import type { Prisma } from "@avrupadasat/db";
import {
  Badge,
  EmptyState,
  PageHeader,
  Pager,
  Toolbar,
  pageNum,
  sp,
  type Tone,
} from "@/components/panel/ui";
import { IconLayers } from "@/components/site/Icons";
import { COMPANY_FORM_LABEL } from "@/server/company";
import { db } from "@/server/db";
import { STEP_LABEL, STEP_STATUS } from "@/server/labels";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Şirket işlemleri" };

const STEP_TONE: Record<string, Tone> = {
  BEKLIYOR: "neutral",
  SURUYOR: "blue",
  TAMAM: "green",
  SORUN: "red",
};
const STEPS = Object.keys(STEP_LABEL) as (keyof typeof STEP_LABEL)[];
const SHORT: Record<string, string> = {
  VEKALETNAME: "Vekâlet",
  APOSTIL: "Apostil",
  NOTER: "Noter",
  TICARET_SICILI: "Sicil",
  VERGI_NO: "Vergi no",
  UST_ID: "USt-Id",
  EORI: "EORI",
  LUCID: "LUCID",
};

export default async function CompanyOps({
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
    ...(q.durum === "sorun"
      ? { registration: { some: { status: "SORUN" } } }
      : q.durum === "tamam"
        ? { registration: { some: {}, every: { status: "TAMAM" } } }
        : { registration: { some: { status: { not: "TAMAM" } } } }),
    ...(q.adim && q.adim in STEP_LABEL
      ? { AND: [{ registration: { some: { step: q.adim as never, status: { not: "TAMAM" } } } }] }
      : {}),
    ...(q.q ? { name: { contains: q.q, mode: "insensitive" } } : {}),
  };
  const [tenants, total] = await Promise.all([
    db().tenant.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: size,
      skip: (page - 1) * size,
      include: { registration: true },
    }),
    db().tenant.count({ where }),
  ]);
  return (
    <>
      <PageHeader
        title="Şirket işlemleri"
        desc="Kuruluş ve kayıt adımları. Noter, sicil ve vergi işlemlerini iş ortağı avukat ve vergi danışmanı yürütür; burada takip edilir."
      />
      <Toolbar
        q={q.q}
        placeholder="Firma adı"
        filters={[
          {
            name: "durum",
            label: "Görünüm",
            all: "Devam edenler",
            value: q.durum,
            options: [
              { value: "sorun", label: "Sorunu olanlar" },
              { value: "tamam", label: "Tamamlananlar" },
            ],
          },
          {
            name: "adim",
            label: "Bekleyen adım",
            value: q.adim,
            options: STEPS.map((k) => ({ value: k, label: STEP_LABEL[k] })),
          },
        ]}
      />
      {total === 0 ? (
        <div className="pc">
          <EmptyState
            icon={<IconLayers size={20} />}
            title="Kayıt yok"
            text="Bu görünümde firma bulunmuyor."
          />
        </div>
      ) : (
        <div className="tw">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th>Firma</th>
                <th>Şirket türü</th>
                {STEPS.map((k) => (
                  <th key={k} title={STEP_LABEL[k]}>
                    {SHORT[k]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => {
                const by = Object.fromEntries(t.registration.map((r) => [r.step, r]));
                return (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/admin/musteriler/${t.id}?sekme=sirket`}>{t.name}</Link>
                    </td>
                    <td data-l="Şirket türü">
                      {t.companyForm ? COMPANY_FORM_LABEL[t.companyForm] : "—"}
                    </td>
                    {STEPS.map((k) => {
                      const r = by[k];
                      return (
                        <td key={k} data-l={STEP_LABEL[k]} title={r?.note ?? undefined}>
                          {r ? (
                            <Badge tone={STEP_TONE[r.status]}>{STEP_STATUS[r.status]}</Badge>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager
        page={page}
        pageSize={size}
        total={total}
        params={{ q: q.q, durum: q.durum, adim: q.adim }}
      />
    </>
  );
}
