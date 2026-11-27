import Link from "next/link";
import type { DocReview, DocumentKind } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { ReviewForm } from "@/components/panel/DocForms";
import { REVIEW_TONE } from "@/components/panel/tones";
import {
  Badge,
  EmptyState,
  Flash,
  PageHeader,
  Pager,
  Toolbar,
  pageNum,
  sp,
} from "@/components/panel/ui";
import { IconFolder } from "@/components/site/Icons";
import { DOC_KIND_LABEL, DOC_REVIEW_LABEL, listPendingDocuments } from "@/server/documents";
import { signDownload } from "@/server/files";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Belgeler" };

const PREVIEW = /\.(pdf|png|jpe?g)$/i;

export default async function AdminDocs({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireStaff("document.review");
  const q = sp(await searchParams);
  const review = (["PENDING", "APPROVED", "REJECTED"] as DocReview[]).includes(q.durum as DocReview)
    ? (q.durum as DocReview)
    : "PENDING";
  const kind = q.tur && q.tur in DOC_KIND_LABEL ? (q.tur as DocumentKind) : undefined;
  const r = await listPendingDocuments({
    review,
    kind,
    q: q.q,
    expiring: q.sure === "1",
    page: pageNum(q.sayfa),
  });
  return (
    <>
      <PageHeader
        title="Belgeler"
        desc="Müşteri yüklemeleri onay bekler. Ret nedenini müşteri görür ve e-posta alır."
      />
      <Flash
        value={q.sonuc}
        messages={{ onay: "Belge onaylandı.", ret: "Belge reddedildi; müşteriye bildirildi." }}
      />
      <Toolbar
        q={q.q}
        placeholder="Dosya adı"
        filters={[
          {
            name: "durum",
            label: "Onay",
            all: "Onay bekleyenler",
            value: q.durum,
            options: Object.entries(DOC_REVIEW_LABEL)
              .filter(([v]) => v !== "PENDING")
              .map(([value, label]) => ({ value, label })),
          },
          {
            name: "tur",
            label: "Tür",
            value: q.tur,
            options: Object.entries(DOC_KIND_LABEL).map(([value, label]) => ({ value, label })),
          },
          {
            name: "sure",
            label: "Geçerlilik",
            value: q.sure,
            options: [{ value: "1", label: "30 gün içinde bitenler" }],
          },
        ]}
      />
      {r.total === 0 ? (
        <div className="pc">
          <EmptyState
            icon={<IconFolder size={20} />}
            title={review === "PENDING" ? "Onay bekleyen belge yok" : "Belge yok"}
            text="Müşteri yeni belge yüklediğinde burada ve bildirimlerinizde görünür."
          />
        </div>
      ) : (
        <div className="tw">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th>Belge</th>
                <th>Firma</th>
                <th>Tür</th>
                <th>Yüklendi</th>
                <th>Geçerlilik</th>
                <th>Durum</th>
                {review === "PENDING" && <th>Karar</th>}
              </tr>
            </thead>
            <tbody>
              {r.items.map((d) => {
                const url = signDownload(d.id, s.userId);
                return (
                  <tr key={d.id}>
                    <td>
                      <b style={{ fontWeight: 500 }}>{d.filename}</b>
                      <div className="row-actions" style={{ fontSize: 12.5, marginTop: 4 }}>
                        {PREVIEW.test(d.filename) && (
                          <a href={`${url}&gor=1`} target="_blank" rel="noopener noreferrer">
                            Önizle
                          </a>
                        )}
                        <a href={url}>İndir</a>
                      </div>
                    </td>
                    <td data-l="Firma">
                      <Link href={`/admin/musteriler/${d.tenantId}?sekme=belgeler`}>
                        {d.tenant.name}
                      </Link>
                    </td>
                    <td data-l="Tür">{DOC_KIND_LABEL[d.kind]}</td>
                    <td data-l="Yüklendi">{fmtDate(d.createdAt, true)}</td>
                    <td data-l="Geçerlilik">{d.expiresAt ? fmtDate(d.expiresAt) : "—"}</td>
                    <td>
                      <Badge tone={REVIEW_TONE[d.review]}>{DOC_REVIEW_LABEL[d.review]}</Badge>
                      {d.reviewNote && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {d.reviewNote}
                        </div>
                      )}
                    </td>
                    {review === "PENDING" && (
                      <td data-l="Karar" style={{ minWidth: 260 }}>
                        <ReviewForm id={d.id} expiresAt={d.expiresAt} back="/admin/belgeler" />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager
        page={r.page}
        pageSize={r.pageSize}
        total={r.total}
        params={{ q: q.q, durum: q.durum, tur: q.tur, sure: q.sure }}
      />
    </>
  );
}
