import Link from "next/link";
import type { ContentPage } from "@/content/types";
import { LeadForm } from "@/components/LeadForm";
import { breadcrumbLd, faqLd, JsonLd, pageLd } from "./JsonLd";

export function ContentView({
  page,
  path,
  parent,
}: {
  page: ContentPage;
  path: string;
  parent?: { name: string; path: string };
}) {
  const crumbs = [
    { name: "Ana sayfa", path: "/" },
    ...(parent ? [parent] : []),
    { name: page.kicker, path },
  ];
  return (
    <article>
      <JsonLd
        data={[
          pageLd(page, path),
          breadcrumbLd(crumbs),
          ...(page.faq?.length ? [faqLd(page.faq)] : []),
        ]}
      />
      <div className="wrap page-head">
        <nav aria-label="Konum" className="crumbs">
          {crumbs.map((c, i) => (
            <span key={c.path}>
              {i < crumbs.length - 1 ? (
                <Link href={c.path}>{c.name}</Link>
              ) : (
                <span aria-current="page">{c.name}</span>
              )}
              {i < crumbs.length - 1 && " / "}
            </span>
          ))}
        </nav>
        <div className="k">{page.kicker}</div>
        <h1>{page.h1}</h1>
        <p className="lead">{page.intro}</p>
      </div>
      <div className="wrap content-grid">
        <div className="prose">
          {page.sections.map((s) => (
            <section key={s.h2}>
              <h2>{s.h2}</h2>
              {s.paragraphs?.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
              {s.bullets && (
                <ul>
                  {s.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
              {s.steps && (
                <ol className="steps">
                  {s.steps.map((st) => (
                    <li key={st.title}>
                      <b>{st.title}</b>
                      <span>{st.text}</span>
                    </li>
                  ))}
                </ol>
              )}
              {s.table && (
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        {s.table.head.map((h) => (
                          <th key={h} scope="col">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((r) => (
                        <tr key={r.join("|")}>
                          {r.map((c, i) =>
                            i === 0 ? (
                              <th key={i} scope="row">
                                {c}
                              </th>
                            ) : (
                              <td key={i}>{c}</td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {s.note && <p className="note">{s.note}</p>}
            </section>
          ))}
          {page.faq && page.faq.length > 0 && (
            <section>
              <h2>Sık sorulanlar</h2>
              <div className="faq">
                {page.faq.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
          <p className="muted" style={{ fontSize: 13 }}>
            Son güncelleme: {new Date(page.updated).toLocaleDateString("tr-TR")}
          </p>
        </div>
        {page.cta && (
          <aside className="card sticky-cta" aria-label="Ücretsiz rapor formu">
            <h2 style={{ fontSize: 20, marginTop: 0 }}>{page.cta.title}</h2>
            <p className="muted">{page.cta.text}</p>
            <LeadForm id="sayfa-formu" />
          </aside>
        )}
      </div>
    </article>
  );
}
