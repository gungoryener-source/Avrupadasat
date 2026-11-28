/**
 * Barkod okutma ve etiket basımı için ürün arama. Kapsam rol bazlıdır:
 * müşteri yalnız kendi firmasını, depo personeli (PARTNER) atandığı firmaları, ekip tüm firmaları görür.
 */
import { STAFF_ROLES, canAccessTenant, type Actor } from "@avrupadasat/core/roles";
import type { Prisma } from "@avrupadasat/db";
import { isLabelCode, normalizeScan } from "./barcode";
import { db } from "./db";

export function stockScope(actor: Actor): Prisma.StockItemWhereInput | null {
  if (actor.role === "PARTNER") return { tenantId: { in: [...(actor.partnerTenantIds ?? [])] } };
  if (STAFF_ROLES.includes(actor.role)) return {};
  return actor.tenantId ? { tenantId: actor.tenantId } : null;
}

export interface ScanHit {
  id: string;
  code: string;
  sku: string;
  name: string;
  ean: string | null;
  location: string | null;
  quantity: number;
  reserved: number;
  tenantName: string;
  image: string | null;
  href: string;
}

export interface ScanResult {
  query: string;
  /** Eşleşme türü: platform etiket kodu, EAN veya SKU */
  by: "code" | "ean" | "sku" | null;
  hits: ScanHit[];
}

/** Okutulan değeri çözer: önce etiket kodu, sonra EAN, sonra SKU (tam eşleşme) */
export async function lookupScan(actor: Actor, raw: string): Promise<ScanResult> {
  const query = normalizeScan(raw).slice(0, 64);
  const scope = stockScope(actor);
  if (!query || !scope) return { query, by: null, hits: [] };
  const staff = STAFF_ROLES.includes(actor.role);
  const select = {
    id: true,
    labelCode: true,
    sku: true,
    name: true,
    ean: true,
    location: true,
    quantity: true,
    reserved: true,
    imageKey: true,
    tenantId: true,
    tenant: { select: { name: true } },
  } as const;
  const tries: [ScanResult["by"], Prisma.StockItemWhereInput][] = [];
  if (isLabelCode(query)) tries.push(["code", { labelCode: query }]);
  if (/^\d{8,14}$/.test(query)) tries.push(["ean", { ean: query }]);
  tries.push(["sku", { sku: { equals: raw.trim(), mode: "insensitive" } }]);
  for (const [by, where] of tries) {
    const rows = await db().stockItem.findMany({
      where: { AND: [scope, where] },
      select,
      take: 10,
      orderBy: { sku: "asc" },
    });
    const allowed = rows.filter((r) => canAccessTenant(actor, r.tenantId));
    if (allowed.length)
      return {
        query,
        by,
        hits: allowed.map((r) => ({
          id: r.id,
          code: r.labelCode,
          sku: r.sku,
          name: r.name,
          ean: r.ean,
          location: r.location,
          quantity: r.quantity,
          reserved: r.reserved,
          tenantName: r.tenant.name,
          image: r.imageKey ? `/api/urun-gorsel/${r.id}` : null,
          href: staff
            ? `/admin/musteriler/${r.tenantId}?sekme=depo&q=${encodeURIComponent(r.sku)}`
            : `/panel/stok/urun/${r.id}`,
        })),
      };
  }
  return { query, by: null, hits: [] };
}

/**
 * Etiket isteğini çözer. Parametreler: u=<id>:<adet> (tekrarlanabilir) veya n_<id>=<adet> (form).
 * Erişilemeyen ürün varsa tümü reddedilir (sessizce atlamak yanlış etiket sayısına yol açar).
 */
export function parseLabelRequest(params: URLSearchParams): Map<string, number> | string {
  const want = new Map<string, number>();
  const add = (id: string, n: number) => want.set(id, (want.get(id) ?? 0) + n);
  for (const u of params.getAll("u")) {
    const [id, n = "1"] = u.split(":");
    if (!id) continue;
    add(id, Number(n));
  }
  for (const [k, v] of params) {
    if (k.startsWith("n_") && v.trim() !== "") add(k.slice(2), Number(v));
  }
  for (const [id, n] of want) {
    if (!/^[a-z0-9]{8,40}$/i.test(id)) return "Geçersiz ürün";
    if (!Number.isInteger(n) || n < 0 || n > 500) return "Adet 0–500 arası tam sayı olmalı";
    if (n === 0) want.delete(id);
  }
  if (want.size === 0) return "En az bir ürün için adet girin";
  if (want.size > 300) return "Tek seferde en fazla 300 farklı ürün";
  return want;
}
