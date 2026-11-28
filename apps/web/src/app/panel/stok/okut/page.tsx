import { Scanner } from "@/components/panel/Scanner";
import { PageHeader } from "@/components/panel/ui";
import { requireClient } from "@/server/session";

export const metadata = { title: "Barkod okut" };

export default async function PanelScan() {
  await requireClient("stock.read");
  return (
    <>
      <PageHeader
        title="Barkod okut"
        crumbs={[{ href: "/panel/stok", label: "Depo ve Stok" }]}
        desc="Etiketin doğru ürüne ait olduğunu kontrol edin: etiket kodu, EAN veya SKU ile arayın."
      />
      <Scanner showTenant={false} />
    </>
  );
}
