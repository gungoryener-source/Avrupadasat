import Link from "next/link";
import { notFound } from "next/navigation";
import { forTenant } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { db } from "@/server/db";
import { requireClient } from "@/server/session";
import { ContentForms } from "./ContentForms";

export default async function ContentPage({ params }: { params: Promise<{ sku: string }> }) {
  const s = await requireClient("catalog.write");
  const sku = decodeURIComponent((await params).sku);
  const t = forTenant(db(), s.actor.tenantId);
  const item = await t.stockItem.findFirst({ where: { sku } });
  if (!item) notFound();
  const c = await t.productContent.findFirst({ where: { sku } });
  return (
    <>
      <p>
        <Link href="/panel/stok">← Stok</Link>
      </p>
      <h1>Almanca ürün içeriği · {item.sku}</h1>
      <p className="muted">
        Türkçe bilgileri girin; yapay zekâ Almanca başlık, madde işaretleri ve açıklama taslağı
        hazırlasın. Yalnız verdiğiniz bilgiler kullanılır; onayınızdan sonra pazaryerine aktarılır.
        {c?.approvedAt && ` Son onay: ${fmtDate(c.approvedAt, true)}.`}
      </p>
      <ContentForms
        sku={item.sku}
        titleTr={c?.titleTr ?? item.name}
        featuresTr={c?.featuresTr ?? ""}
        titleDe={c?.titleDe ?? ""}
        bulletsDe={c?.bulletsDe ?? ""}
        descriptionDe={c?.descriptionDe ?? ""}
        approved={c?.status === "APPROVED"}
      />
    </>
  );
}
