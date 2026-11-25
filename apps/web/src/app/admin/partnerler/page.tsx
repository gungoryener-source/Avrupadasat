import { redirect } from "next/navigation";
import { requireStaff } from "@/server/session";
import { scorecards, TARGETS } from "@/server/scorecard";

export const metadata = { title: "Partner skor kartı" };

function Cell({
  v,
  target,
  higherBetter,
  unit = "%",
}: {
  v: number | null;
  target: number;
  higherBetter: boolean;
  unit?: string;
}) {
  if (v === null) return <td className="muted">—</td>;
  const ok = higherBetter ? v >= target : v <= target;
  return (
    <td>
      <span className={`tag ${ok ? "ok" : "red"}`}>
        {v}
        {unit}
      </span>
    </td>
  );
}

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ gun?: string }>;
}) {
  const s = await requireStaff("tenant.read");
  if (s.actor.role === "PARTNER") redirect("/admin?hata=yetki");
  const days = Math.min(365, Math.max(7, Number((await searchParams).gun ?? 30) || 30));
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const rows = await scorecards(from, to);
  return (
    <>
      <h1>Partner skor kartı</h1>
      <p className="muted">
        Son {days} gün · Hedefler: mal kabul doğruluğu ≥ %{TARGETS.receivingAccuracyPct}, 24 saatte
        kargo ≥ %{TARGETS.onTimeShipPct}, hasar ≤ %{TARGETS.damagePct}, iade işleme ≤{" "}
        {TARGETS.returnDays} gün (SLA ile netleşecek)
      </p>
      <table className="tbl">
        <thead>
          <tr>
            <th>Partner</th>
            <th>Firma</th>
            <th>Mal kabul</th>
            <th>Kabul doğruluğu</th>
            <th>Hasar</th>
            <th>Kargolanan</th>
            <th>24 saatte kargo</th>
            <th>İade işleme</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.partnerId}>
              <td>{r.partnerName}</td>
              <td>{r.tenants}</td>
              <td>{r.receivedShipments}</td>
              <Cell v={r.receivingAccuracyPct} target={TARGETS.receivingAccuracyPct} higherBetter />
              <Cell v={r.damagePct} target={TARGETS.damagePct} higherBetter={false} />
              <td>{r.ordersShipped}</td>
              <Cell v={r.onTimeShipPct} target={TARGETS.onTimeShipPct} higherBetter />
              <Cell
                v={r.avgReturnDays}
                target={TARGETS.returnDays}
                higherBetter={false}
                unit=" gün"
              />
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="muted">
                Partner yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
