import { revalidatePath } from "next/cache";
import { z } from "zod";
import { formatEur } from "@avrupadasat/core/pricing";
import { fmtDate } from "@/components/AppShell";
import { Submit } from "@/components/Submit";
import { audit } from "@/server/audit";
import { draftInvoice, issueInvoice, markPaid } from "@/server/billing";
import { db } from "@/server/db";
import { INVOICE_STATUS } from "@/server/labels-ops";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Faturalar" };

const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

async function draftAllAction(fd: FormData) {
  "use server";
  const s = await requireStaff("invoice.write");
  const p = period.parse(fd.get("period"));
  const tenants = await db().tenant.findMany({
    where: { status: { in: ["ACTIVE", "ONBOARDING"] } },
    select: { id: true },
  });
  for (const t of tenants) await draftInvoice(t.id, p, s.userId);
  revalidatePath("/admin/faturalar");
}

async function issueAction(fd: FormData) {
  "use server";
  const s = await requireStaff("invoice.write");
  await issueInvoice(z.string().parse(fd.get("id")), s.userId);
  revalidatePath("/admin/faturalar");
}

async function paidAction(fd: FormData) {
  "use server";
  const s = await requireStaff("invoice.write");
  await markPaid(z.string().parse(fd.get("id")), s.userId);
  revalidatePath("/admin/faturalar");
}

async function disbursementAction(fd: FormData) {
  "use server";
  const s = await requireStaff("invoice.write");
  const i = z
    .object({
      tenantId: z.string().min(1),
      description: z.string().min(3).max(200),
      amount: z.coerce.number().positive().max(1_000_000),
      incurredAt: z.coerce.date(),
    })
    .parse(Object.fromEntries(fd));
  const d = await db().disbursement.create({
    data: {
      tenantId: i.tenantId,
      description: i.description,
      amountCents: Math.round(i.amount * 100),
      incurredAt: i.incurredAt,
      createdById: s.userId,
    },
  });
  await audit({
    actorUserId: s.userId,
    tenantId: i.tenantId,
    action: "invoice.generated",
    entity: "Disbursement",
    entityId: d.id,
  });
  revalidatePath("/admin/faturalar");
}

export default async function AdminInvoices({
  searchParams,
}: {
  searchParams: Promise<{ firma?: string }>;
}) {
  await requireStaff("invoice.read");
  const { firma } = await searchParams;
  const [invs, tenants, openDisb] = await Promise.all([
    db().invoice.findMany({
      where: firma ? { tenantId: firma } : {},
      include: { tenant: { select: { name: true } } },
      orderBy: [{ period: "desc" }, { createdAt: "desc" }],
      take: 300,
    }),
    db().tenant.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db().disbursement.findMany({
      where: { invoiceId: null },
      orderBy: { incurredAt: "desc" },
      take: 50,
    }),
  ]);
  const now = new Date();
  const defaultPeriod = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (now.getUTCDate() < 5 ? 1 : 0), 1),
  )
    .toISOString()
    .slice(0, 7);
  const tName = new Map(tenants.map((t) => [t.id, t.name]));
  return (
    <>
      <h1>Faturalar</h1>
      <div className="g2" style={{ marginBottom: 18 }}>
        <form action={draftAllAction} className="card form">
          <h2 style={{ margin: 0, fontSize: 19 }}>Aylık taslakları oluştur</h2>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Kullanım (depolama ortalaması, mal kabul, paketleme, iade) ve masraflar dönem için
            hesaplanır. Taslaklar kesilene kadar yeniden hesaplanabilir.
          </p>
          <div className="field">
            <label htmlFor="period">Dönem</label>
            <input
              id="period"
              name="period"
              defaultValue={defaultPeriod}
              pattern="\d{4}-\d{2}"
              required
            />
          </div>
          <Submit>Taslakları oluştur</Submit>
        </form>
        <form action={disbursementAction} className="card form">
          <h2 style={{ margin: 0, fontSize: 19 }}>Masraf yansıtma ekle</h2>
          <div className="field">
            <label htmlFor="d-tenant">Firma</label>
            <select id="d-tenant" name="tenantId">
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="inline-form">
            <div className="field">
              <label htmlFor="d-desc">Açıklama</label>
              <input
                id="d-desc"
                name="description"
                required
                placeholder="Noter harcı / DHL kargo"
              />
            </div>
            <div className="field">
              <label htmlFor="d-amt">Tutar (€)</label>
              <input
                id="d-amt"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                style={{ width: 110 }}
              />
            </div>
            <div className="field">
              <label htmlFor="d-date">Tarih</label>
              <input
                id="d-date"
                name="incurredAt"
                type="date"
                required
                defaultValue={now.toISOString().slice(0, 10)}
              />
            </div>
          </div>
          <Submit className="btn btn-o">Ekle</Submit>
          {openDisb.length > 0 && (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              Faturalanmamış:{" "}
              {openDisb
                .map(
                  (d) =>
                    `${tName.get(d.tenantId)} — ${d.description} ${formatEur(d.amountCents, { decimals: true })}`,
                )
                .join(" · ")}
            </p>
          )}
        </form>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Firma</th>
            <th>Dönem</th>
            <th>No</th>
            <th>Net</th>
            <th>KDV</th>
            <th>Toplam</th>
            <th>Durum</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {invs.map((i) => (
            <tr key={i.id}>
              <td>{i.tenant.name}</td>
              <td>{i.period}</td>
              <td className="mono">{i.number ?? "—"}</td>
              <td>{formatEur(i.netCents, { decimals: true })}</td>
              <td>%{i.vatRatePct}</td>
              <td>
                <b>{formatEur(i.grossCents, { decimals: true })}</b>
              </td>
              <td>
                <span className={`tag ${INVOICE_STATUS[i.status][1]}`}>
                  {INVOICE_STATUS[i.status][0]}
                </span>
                {i.dueAt && i.status === "ISSUED" && i.dueAt < now && (
                  <span className="tag red"> Vadesi geçti</span>
                )}
              </td>
              <td>
                {i.status === "DRAFT" && i.netCents > 0 && (
                  <form action={issueAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <Submit className="btn btn-sm" pendingText="…">
                      Kes
                    </Submit>
                  </form>
                )}
                {i.status === "ISSUED" && (
                  <>
                    <a href={`/fatura/${i.id}`} target="_blank" rel="noopener">
                      PDF
                    </a>{" "}
                    <form action={paidAction} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={i.id} />
                      <Submit className="btn btn-o btn-sm" pendingText="…">
                        Ödendi
                      </Submit>
                    </form>
                  </>
                )}
                {i.status === "PAID" && (
                  <a href={`/fatura/${i.id}`} target="_blank" rel="noopener">
                    PDF · {fmtDate(i.paidAt)}
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
