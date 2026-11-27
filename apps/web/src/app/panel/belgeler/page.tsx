import { nowMs } from "@/server/clock";
import Link from "next/link";
import type { DocReview, DocumentKind } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { Badge, EmptyState, PageHeader, Pager, Toolbar, pageNum, sp } from "@/components/panel/ui";
import { IconFolder } from "@/components/site/Icons";
import {
  DOC_KIND_LABEL,
  DOC_REVIEW_LABEL,
  listDocuments,
  type DocFilter,
} from "@/server/documents";
import { signDownload } from "@/server/files";
import { requireClient } from "@/server/session";
import { UploadForm } from "../forms";

export const metadata = { title: "Belgelerim" };

const SORT_OPTS = [
  { value: "new", label: "En yeni" },
  { value: "old", label: "En eski" },
  { value: "name", label: "Ada göre" },
  { value: "expires", label: "Geçerlilik tarihine göre" },
];

function fmtSize(n: number) {
  return n > 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;
}

export default async function DocsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireClient("shipment.read");
  const q = sp(await searchParams);
  const kind = q.tur && q.tur in DOC_KIND_LABEL ? (q.tur as DocumentKind) : undefined;
  const review = q.durum && q.durum in DOC_REVIEW_LABEL ? (q.durum as DocReview) : undefined;
  const sort = (
    SORT_OPTS.some((o) => o.value === q.sirala) ? q.sirala : "new"
  ) as DocFilter["sort"];
  const r = await listDocuments(s.actor.tenantId, {
    q: q.q,
    kind,
    review,
    expiring: q.sure === "1",
    sort,
    page: pageNum(q.sayfa),
  });
  const now = nowMs();
  const params = { q: q.q, tur: q.tur, durum: q.durum, sirala: q.sirala, sure: q.sure };
  return (
    <>
      <PageHeader
        title="Belgelerim"
        desc="Şirket, ürün, vergi ve sevkiyat belgeleriniz. Yüklediğiniz belgeler ekibimizce kontrol edilip onaylanır."
      />
      <div className="pc" style={{ marginBottom: 16 }}>
        <UploadForm defaultKind={kind ?? "CE_BEYAN"} />
      </div>
      <Toolbar
        q={q.q}
        placeholder="Dosya adı"
        filters={[
          {
            name: "tur",
            label: "Kategori",
            value: q.tur,
            options: Object.entries(DOC_KIND_LABEL).map(([value, label]) => ({ value, label })),
          },
          {
            name: "durum",
            label: "Onay",
            value: q.durum,
            options: Object.entries(DOC_REVIEW_LABEL).map(([value, label]) => ({ value, label })),
          },
          {
            name: "sure",
            label: "Geçerlilik",
            value: q.sure,
            options: [{ value: "1", label: "30 gün içinde dolan" }],
          },
          { name: "sirala", label: "Sıralama", value: q.sirala, options: SORT_OPTS },
        ]}
      />
      {r.items.length === 0 ? (
        <div className="pc">
          <EmptyState
            icon={<IconFolder size={20} />}
            title={q.q || kind || review || q.sure ? "Sonuç yok" : "Henüz belge yok"}
            text={
              q.q || kind || review || q.sure
                ? "Filtreleri değiştirip tekrar deneyin."
                : "Yukarıdaki formla ilk belgenizi yükleyin. PDF, JPG, PNG ve Office dosyaları desteklenir."
            }
          />
        </div>
      ) : (
        <div className="tw">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th>Belge</th>
                <th>Kategori</th>
                <th>Sevkiyat</th>
                <th>Yüklenme</th>
                <th>Geçerlilik</th>
                <th>Onay</th>
                <th>
                  <span className="sr-only">İşlemler</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {r.items.map((d) => {
                const url = signDownload(d.id, s.userId);
                const previewable = /^(application\/pdf|image\/(png|jpeg))$/.test(d.mime);
                const expired = d.expiresAt && +d.expiresAt < now;
                return (
                  <tr key={d.id}>
                    <td>
                      <b style={{ fontWeight: 500 }}>{d.filename}</b>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {fmtSize(d.size)}
                        {d.scanStatus === "skipped"
                          ? " · virüs taraması yapılmadı"
                          : d.scanStatus === "clean"
                            ? " · tarandı"
                            : ""}
                      </div>
                      {d.review === "REJECTED" && d.reviewNote && (
                        <div style={{ fontSize: 12.5, color: "var(--err)", marginTop: 4 }}>
                          Ret nedeni: {d.reviewNote}
                        </div>
                      )}
                    </td>
                    <td data-l="Kategori">{DOC_KIND_LABEL[d.kind]}</td>
                    <td data-l="Sevkiyat">
                      {d.shipment ? (
                        <Link href={`/panel/sevkiyatlar/${d.shipmentId}`}>
                          {d.shipment.reference}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-l="Yüklenme">{fmtDate(d.createdAt)}</td>
                    <td data-l="Geçerlilik">
                      {d.expiresAt ? (
                        <>
                          {fmtDate(d.expiresAt)}{" "}
                          {expired ? (
                            <Badge tone="red">Doldu</Badge>
                          ) : +d.expiresAt - now < 30 * 86400_000 ? (
                            <Badge tone="amber">Yakında</Badge>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Badge
                        tone={
                          d.review === "APPROVED"
                            ? "green"
                            : d.review === "REJECTED"
                              ? "red"
                              : "amber"
                        }
                      >
                        {DOC_REVIEW_LABEL[d.review]}
                      </Badge>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {previewable && (
                        <a
                          className="btn btn-o btn-sm"
                          href={`${url}&gor=1`}
                          target="_blank"
                          rel="noopener"
                        >
                          Önizle
                        </a>
                      )}{" "}
                      <a className="btn btn-o btn-sm" href={url}>
                        İndir
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={r.page} pageSize={r.pageSize} total={r.total} params={params} />
    </>
  );
}
