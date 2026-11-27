import type { DocReview, DocumentKind } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { ReviewForm, StaffUploadForm } from "@/components/panel/DocForms";
import { REVIEW_TONE } from "@/components/panel/tones";
import { Badge, Card, EmptyState, Flash, Pager, Toolbar, pageNum } from "@/components/panel/ui";
import { DOC_KIND_LABEL, DOC_REVIEW_LABEL, listDocuments } from "@/server/documents";
import { signDownload } from "@/server/files";
import type { TabCtx } from "./ctx";

const PREVIEW = /\.(pdf|png|jpe?g)$/i;

export async function DocumentsTab({ tenantId, userId, q }: TabCtx) {
  const review = q.durum && q.durum in DOC_REVIEW_LABEL ? (q.durum as DocReview) : undefined;
  const kind = q.tur && q.tur in DOC_KIND_LABEL ? (q.tur as DocumentKind) : undefined;
  const r = await listDocuments(tenantId, { q: q.q, review, kind, page: pageNum(q.sayfa) });
  return (
    <div className="grid grid-main">
      <div>
        <Flash
          value={q.sonuc}
          messages={{ onay: "Belge onaylandı.", ret: "Belge reddedildi; müşteriye bildirildi." }}
        />
        <Toolbar
          q={q.q}
          placeholder="Dosya adı"
          keep={{ sekme: "belgeler" }}
          filters={[
            {
              name: "durum",
              label: "Onay",
              value: q.durum,
              options: Object.entries(DOC_REVIEW_LABEL).map(([value, label]) => ({ value, label })),
            },
            {
              name: "tur",
              label: "Tür",
              value: q.tur,
              options: Object.entries(DOC_KIND_LABEL).map(([value, label]) => ({ value, label })),
            },
          ]}
        />
        {r.total === 0 ? (
          <Card>
            <EmptyState title="Belge yok" text="Müşteri veya ekip yüklediğinde burada görünür." />
          </Card>
        ) : (
          <div className="tw">
            <table className="tbl tbl-stack">
              <thead>
                <tr>
                  <th>Belge</th>
                  <th>Tür</th>
                  <th>Yüklendi</th>
                  <th>Geçerlilik</th>
                  <th>Onay</th>
                </tr>
              </thead>
              <tbody>
                {r.items.map((d) => {
                  const url = signDownload(d.id, userId);
                  return (
                    <tr key={d.id}>
                      <td>
                        <b style={{ fontWeight: 500 }}>{d.filename}</b>
                        {d.shipment && (
                          <div className="muted" style={{ fontSize: 12 }}>
                            Sevkiyat {d.shipment.reference}
                          </div>
                        )}
                        <div className="row-actions" style={{ fontSize: 12.5, marginTop: 4 }}>
                          {PREVIEW.test(d.filename) && (
                            <a href={`${url}&gor=1`} target="_blank" rel="noopener noreferrer">
                              Önizle
                            </a>
                          )}
                          <a href={url}>İndir</a>
                        </div>
                      </td>
                      <td data-l="Tür">{DOC_KIND_LABEL[d.kind]}</td>
                      <td data-l="Yüklendi">{fmtDate(d.createdAt)}</td>
                      <td data-l="Geçerlilik">{d.expiresAt ? fmtDate(d.expiresAt) : "—"}</td>
                      <td data-l="Onay" style={{ minWidth: 220 }}>
                        <Badge tone={REVIEW_TONE[d.review]}>{DOC_REVIEW_LABEL[d.review]}</Badge>
                        {d.reviewNote && (
                          <div className="muted" style={{ fontSize: 12 }}>
                            {d.reviewNote}
                          </div>
                        )}
                        {d.review === "PENDING" && (
                          <div style={{ marginTop: 8 }}>
                            <ReviewForm
                              id={d.id}
                              expiresAt={d.expiresAt}
                              back={`/admin/musteriler/${tenantId}?sekme=belgeler`}
                            />
                          </div>
                        )}
                      </td>
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
          params={{ sekme: "belgeler", q: q.q, durum: q.durum, tur: q.tur }}
        />
      </div>
      <Card title="Belge yükle">
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Ekip yüklemeleri doğrudan onaylı olur ve müşterinin Belgelerim sayfasında görünür.
        </p>
        <StaffUploadForm tenantId={tenantId} />
      </Card>
    </div>
  );
}
