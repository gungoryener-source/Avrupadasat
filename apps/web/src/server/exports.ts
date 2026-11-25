/**
 * Muhasebe dışa aktarımları.
 * DATEV: "Buchungsstapel" sütunlarına uyumlu sade CSV. TODO(verify): hesap planı (SKR03/04),
 * gelir hesabı ve müşteri (Debitor) numaralandırması Steuerberater ile netleşecek; tam EXTF başlığı eklenecek.
 */
import { periodRange } from "@avrupadasat/core/billing";
import { db } from "./db";
import { toCsv } from "./csv";

export const DATEV_DEFAULTS = {
  /** SKR03 19% hasılat (doğrulanacak) */
  revenueAccount19: "8400",
  /** Yurt dışı / vergi dışı hizmet (doğrulanacak) */
  revenueAccount0: "8338",
  debitorBase: 10000,
};

const de = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const ddmm = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, "0")}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export async function datevCsv(period: string): Promise<{ csv: string; rows: number }> {
  const [from, to] = periodRange(period);
  const invoices = await db().invoice.findMany({
    where: { issuedAt: { gte: from, lt: to }, status: { in: ["ISSUED", "PAID"] } },
    include: { tenant: { select: { name: true, createdAt: true } } },
    orderBy: { number: "asc" },
  });
  // Kararlı Debitor numarası: firmanın oluşturulma sırasına göre
  const allTenants = await db().tenant.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const debitor = new Map(
    allTenants.map((t, i) => [t.id, String(DATEV_DEFAULTS.debitorBase + i + 1)]),
  );
  const head = [
    "Umsatz (ohne Soll/Haben-Kz)",
    "Soll/Haben-Kennzeichen",
    "WKZ Umsatz",
    "Konto",
    "Gegenkonto (ohne BU-Schlüssel)",
    "Belegdatum",
    "Belegfeld 1",
    "Buchungstext",
  ];
  const rows = invoices.map((i) => [
    de(i.grossCents),
    "S",
    "EUR",
    debitor.get(i.tenantId) ?? "",
    i.vatRatePct === 19 ? DATEV_DEFAULTS.revenueAccount19 : DATEV_DEFAULTS.revenueAccount0,
    ddmm(i.issuedAt!),
    i.number ?? "",
    `${i.tenant.name} ${i.period}`.slice(0, 60),
  ]);
  return { csv: toCsv([head, ...rows]), rows: rows.length };
}

/** Müşterinin pazaryeri satışlarının varış ülkesine göre özeti (OSS beyanına yardımcı; beyan müşterinin sorumluluğundadır) */
export async function ossSummary(tenantId: string, period: string) {
  const [from, to] = periodRange(period);
  const groups = await db().order.groupBy({
    by: ["country"],
    where: { tenantId, shippedAt: { gte: from, lt: to } },
    _count: true,
    _sum: { itemsCents: true },
    orderBy: { country: "asc" },
  });
  return groups.map((g) => ({
    country: g.country,
    orders: g._count,
    grossCents: g._sum.itemsCents ?? 0,
  }));
}

export function ossCsv(rows: Awaited<ReturnType<typeof ossSummary>>, period: string) {
  return toCsv([
    ["donem", "ulke", "siparis", "brut_satis_eur"],
    ...rows.map((r) => [period, r.country, r.orders, de(r.grossCents)]),
  ]);
}
