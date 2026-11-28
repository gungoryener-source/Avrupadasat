import { STAFF_ROLES } from "@avrupadasat/core/roles";
import { Scanner } from "@/components/panel/Scanner";
import { PageHeader } from "@/components/panel/ui";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Barkod okut" };

export default async function AdminScan() {
  const s = await requireStaff("stock.read");
  return (
    <>
      <PageHeader
        title="Barkod okut"
        crumbs={[{ href: "/admin/stok", label: "Depo ve stok" }]}
        desc={
          s.actor.role === "PARTNER"
            ? "Yalnız atandığınız firmaların ürünleri bulunur."
            : "Etiket kodu, EAN veya SKU ile ürünü, firmasını ve rafını bulun."
        }
      />
      <Scanner showTenant={STAFF_ROLES.includes(s.actor.role) || s.actor.role === "PARTNER"} />
    </>
  );
}
