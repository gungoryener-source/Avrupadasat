import Link from "next/link";
import { can } from "@avrupadasat/core/roles";
import { formatEur } from "@avrupadasat/core/pricing";
import { forTenant } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { PackageForm } from "@/components/panel/PackageForm";
import { Badge, Card, EmptyState } from "@/components/panel/ui";
import { db } from "@/server/db";
import { PACKAGE_LABEL } from "@/server/labels";
import type { TabCtx } from "./ctx";

const INV: Record<
  "DRAFT" | "ISSUED" | "PAID" | "VOID",
  ["neutral" | "amber" | "green" | "red", string]
> = {
  DRAFT: ["neutral", "Taslak"],
  ISSUED: ["amber", "Ödeme bekliyor"],
  PAID: ["green", "Ödendi"],
  VOID: ["red", "İptal"],
};

export async function BillingTab({ tenantId, actor }: TabCtx) {
  const t = forTenant(db(), tenantId);
  const [tenant, contracts, invoices] = await Promise.all([
    db().tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { packageCode: true } }),
    t.contract.findMany({
      include: { quote: { select: { number: true } } },
      orderBy: { signedAt: "desc" },
    }),
    t.invoice.findMany({ orderBy: { period: "desc" }, take: 24 }),
  ]);
  const open = invoices.filter((i) => i.status === "ISSUED");
  return (
    <div className="grid grid-main">
      <Card
        title="Faturalar"
        action={<Link href={`/admin/faturalar?firma=${tenantId}`}>Faturalamaya git</Link>}
        pad={invoices.length === 0}
      >
        {invoices.length === 0 ? (
          <EmptyState
            title="Fatura yok"
            text="Aylık taslak, Ödemeler ve faturalar sayfasından hazırlanır."
          />
        ) : (
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th>Dönem</th>
                <th>No</th>
                <th className="num">Tutar (KDV dahil)</th>
                <th>Vade</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td className="mono">{i.period}</td>
                  <td data-l="No" className="mono">
                    {i.number ?? "—"}
                  </td>
                  <td data-l="Tutar" className="num">
                    {formatEur(i.grossCents, { decimals: true })}
                  </td>
                  <td data-l="Vade">{i.dueAt ? fmtDate(i.dueAt) : "—"}</td>
                  <td data-l="Durum">
                    <Badge tone={INV[i.status][0]}>{INV[i.status][1]}</Badge>
                    {i.paidAt && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {fmtDate(i.paidAt)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <div className="grid" style={{ alignContent: "start" }}>
        <Card title="Paket">
          <p style={{ marginTop: 0 }}>
            <b>{tenant.packageCode ? PACKAGE_LABEL[tenant.packageCode] : "Paket yok"}</b>
          </p>
          {can(actor.role, "subscription.manage") && (
            <PackageForm tenantId={tenantId} current={tenant.packageCode} />
          )}
          <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
            Ödeme banka havalesiyle alınır; bu panelde tahsilat yapılmaz. Açık fatura: {open.length}
            {open.length > 0 &&
              ` · ${formatEur(
                open.reduce((a, i) => a + i.grossCents, 0),
                { decimals: true },
              )}`}
          </p>
        </Card>
        <Card title="Sözleşmeler">
          {contracts.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Sözleşme yok.
            </p>
          ) : (
            <ul className="ls">
              {contracts.map((c) => (
                <li key={c.id}>
                  <div className="ls-main">
                    <Link href={`/admin/teklifler/${c.quoteId}`}>{c.quote.number}</Link>
                    <small>
                      {c.signerName} · {fmtDate(c.signedAt, true)} · şartlar {c.termsVersion}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
