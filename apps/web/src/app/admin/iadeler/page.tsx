import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { can, canAccessTenant } from "@avrupadasat/core/roles";
import type { Prisma } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Pager,
  Tabs,
  Toolbar,
  pageNum,
  sp,
} from "@/components/panel/ui";
import { IconReturn } from "@/components/site/Icons";
import { Submit } from "@/components/Submit";
import { tenantOptions, tenantScope } from "@/server/admin-data";
import { db } from "@/server/db";
import { CHANNEL_LABEL, RETURN_CONDITION } from "@/server/labels-ops";
import { processReturn, registerReturn } from "@/server/orders";
import { requireStaff } from "@/server/session";

export const metadata = { title: "İadeler" };

async function guard(tenantId: string) {
  const s = await requireStaff("order.write");
  if (!canAccessTenant(s.actor, tenantId)) redirect("/admin?hata=yetki");
  return s;
}

async function returnAction(fd: FormData) {
  "use server";
  const i = z
    .object({
      tenantId: z.string().min(1),
      sku: z.string().trim().min(1),
      quantity: z.coerce.number().int().min(1).max(100000),
      reason: z.string().max(200).optional(),
    })
    .parse(Object.fromEntries(fd));
  const s = await guard(i.tenantId);
  await registerReturn(
    i.tenantId,
    { sku: i.sku, quantity: i.quantity, reason: i.reason || undefined },
    s.userId,
  );
  revalidatePath("/admin/iadeler");
}

async function processAction(fd: FormData) {
  "use server";
  const i = z
    .object({
      tenantId: z.string(),
      returnId: z.string(),
      condition: z.enum(["SELLABLE", "REPACK", "DAMAGED"]),
    })
    .parse(Object.fromEntries(fd));
  const s = await guard(i.tenantId);
  await processReturn(i.tenantId, i.returnId, i.condition, s.userId);
  revalidatePath("/admin/iadeler");
}

export default async function AdminReturns({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireStaff("order.read");
  const q = sp(await searchParams);
  const write = can(s.actor.role, "order.write");
  const tenants = await tenantOptions(s.actor);
  const page = pageNum(q.sayfa);
  const size = 30;
  const where: Prisma.ReturnItemWhereInput = {
    ...tenantScope(s.actor, tenants.some((t) => t.value === q.firma) ? q.firma : undefined),
    ...(q.durum === "tumu"
      ? {}
      : q.durum && q.durum in RETURN_CONDITION
        ? { condition: q.durum as keyof typeof RETURN_CONDITION }
        : { status: "RECEIVED" }),
    ...(q.q
      ? {
          OR: [
            { sku: { contains: q.q, mode: "insensitive" } },
            { reason: { contains: q.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    db().returnItem.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: size,
      skip: (page - 1) * size,
      include: { order: { select: { externalId: true, channel: true } } },
    }),
    db().returnItem.count({ where }),
  ]);
  const tName = Object.fromEntries(tenants.map((t) => [t.value, t.label]));
  return (
    <>
      <PageHeader
        title="İadeler"
        desc="Depoya gelen iadeleri kontrol edin. Satılabilir işaretlenen adet stoğa geri eklenir."
      />
      <Tabs
        active="returns"
        items={[
          { key: "orders", label: "Sipariş kuyruğu", href: "/admin/siparisler" },
          { key: "returns", label: "İadeler", href: "/admin/iadeler" },
        ]}
      />
      {write && (
        <details className="pc drawer" style={{ marginBottom: 16 }}>
          <summary>+ İade kaydet</summary>
          <form action={returnAction} className="form">
            <div className="form-row">
              <div className="field">
                <label htmlFor="r-tenant">Firma</label>
                <select id="r-tenant" name="tenantId" required defaultValue="">
                  <option value="" disabled>
                    Seçin
                  </option>
                  {tenants.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="r-sku">SKU</label>
                <input id="r-sku" name="sku" required />
              </div>
              <div className="field">
                <label htmlFor="r-qty">Adet</label>
                <input id="r-qty" name="quantity" type="number" min={1} defaultValue={1} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="r-reason">Neden</label>
              <input id="r-reason" name="reason" maxLength={200} />
            </div>
            <div>
              <Submit>İadeyi kaydet</Submit>
            </div>
          </form>
        </details>
      )}
      <Toolbar
        q={q.q}
        placeholder="SKU veya neden"
        filters={[
          {
            name: "durum",
            label: "Durum",
            all: "Kontrol bekleyenler",
            value: q.durum,
            options: [
              { value: "tumu", label: "Tümü" },
              ...Object.entries(RETURN_CONDITION).map(([value, label]) => ({ value, label })),
            ],
          },
          { name: "firma", label: "Firma", value: q.firma, options: tenants },
        ]}
      />
      {total === 0 ? (
        <Card>
          <EmptyState
            icon={<IconReturn size={20} />}
            title="İade yok"
            text="Bu görünümde kontrol bekleyen iade bulunmuyor."
          />
        </Card>
      ) : (
        <div className="tw">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Firma</th>
                <th>Sipariş</th>
                <th>Neden</th>
                <th>Geldi</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="mono">
                    {r.quantity}× {r.sku}
                  </td>
                  <td data-l="Firma">{tName[r.tenantId] ?? "—"}</td>
                  <td data-l="Sipariş">
                    {r.order ? `${CHANNEL_LABEL[r.order.channel]} ${r.order.externalId}` : "—"}
                  </td>
                  <td data-l="Neden">{r.reason ?? "—"}</td>
                  <td data-l="Geldi">{fmtDate(r.createdAt, true)}</td>
                  <td data-l="Durum">
                    {r.condition ? (
                      <Badge
                        tone={
                          r.condition === "SELLABLE"
                            ? "green"
                            : r.condition === "DAMAGED"
                              ? "red"
                              : "amber"
                        }
                      >
                        {RETURN_CONDITION[r.condition]}
                      </Badge>
                    ) : write ? (
                      <form action={processAction} className="row-actions">
                        <input type="hidden" name="tenantId" value={r.tenantId} />
                        <input type="hidden" name="returnId" value={r.id} />
                        <select
                          name="condition"
                          defaultValue="SELLABLE"
                          aria-label={`${r.sku} durum`}
                        >
                          {Object.entries(RETURN_CONDITION).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                        <Submit className="btn btn-o btn-sm" pendingText="…">
                          İşle
                        </Submit>
                      </form>
                    ) : (
                      <Badge tone="amber">Kontrol bekliyor</Badge>
                    )}
                  </td>
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
        params={{ q: q.q, durum: q.durum, firma: q.firma }}
      />
    </>
  );
}
