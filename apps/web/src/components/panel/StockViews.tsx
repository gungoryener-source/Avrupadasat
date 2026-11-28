/** Ortak stok görünümleri: ürün küçük görseli ve hareket tablosu (müşteri + ekip) */
import { fmtDate } from "@/components/AppShell";
import { Badge, EmptyState, Pager } from "@/components/panel/ui";
import { MOVEMENT_LABEL, type listMovements } from "@/server/stock";

export function Thumb({ id, has, name }: { id: string; has: boolean; name: string }) {
  return has ? (
    // eslint-disable-next-line @next/next/no-img-element -- yetkili rota, optimize edilmez
    <img className="thumb" src={`/api/urun-gorsel/${id}`} alt={name} width={40} height={40} />
  ) : (
    <span className="thumb thumb-empty" aria-hidden="true" />
  );
}

export function MovementTable({
  data,
  params,
  showSku = true,
}: {
  data: Awaited<ReturnType<typeof listMovements>>;
  params: Record<string, string | undefined>;
  showSku?: boolean;
}) {
  if (data.total === 0)
    return (
      <div className="pc">
        <EmptyState
          title="Hareket yok"
          text="Mal kabul, sipariş çıkışı, iade ve sayım düzeltmeleri burada listelenir."
        />
      </div>
    );
  return (
    <>
      <div className="tw">
        <table className="tbl tbl-stack">
          <thead>
            <tr>
              <th>Zaman</th>
              {showSku && <th>SKU</th>}
              <th>Hareket</th>
              <th className="num">Miktar</th>
              <th>Açıklama</th>
              <th>Kişi</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((m) => (
              <tr key={m.id}>
                <td style={{ whiteSpace: "nowrap" }}>{fmtDate(m.createdAt, true)}</td>
                {showSku && (
                  <td data-l="SKU" className="mono">
                    {m.sku}
                  </td>
                )}
                <td data-l="Hareket">
                  <Badge
                    tone={
                      m.reason === "RECEIVE" || m.reason === "RETURN"
                        ? "green"
                        : m.reason === "ORDER"
                          ? "blue"
                          : m.reason === "DAMAGE"
                            ? "red"
                            : "neutral"
                    }
                  >
                    {MOVEMENT_LABEL[m.reason] ?? m.reason}
                  </Badge>
                </td>
                <td data-l="Miktar" className="num mono">
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </td>
                <td data-l="Açıklama" className="muted" style={{ fontSize: 13 }}>
                  {m.note ?? "—"}
                </td>
                <td data-l="Kişi" style={{ fontSize: 13 }}>
                  {m.actorUserId ? (data.who[m.actorUserId] ?? "—") : "Sistem"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={data.page} pageSize={data.pageSize} total={data.total} params={params} />
    </>
  );
}
