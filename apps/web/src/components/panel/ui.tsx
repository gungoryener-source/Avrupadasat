/**
 * Panel arayüz parçaları: sayfa başlığı, durum rozeti, boş durum, tablo araç çubuğu, sayfalama, sekmeler.
 * Tablolar sunucu tarafında aranır/sıralanır/sayfalanır (URL parametreleri) — JS olmadan da çalışır.
 */
import Link from "next/link";
import { IconSearch } from "../site/Icons";

export function PageHeader({
  title,
  desc,
  actions,
  crumbs,
}: {
  title: string;
  desc?: React.ReactNode;
  actions?: React.ReactNode;
  crumbs?: { href: string; label: string }[];
}) {
  return (
    <div className="ph">
      <div>
        {crumbs && (
          <nav className="ph-crumbs" aria-label="Sayfa yolu">
            {crumbs.map((c) => (
              <Link key={c.href} href={c.href}>
                {c.label}
              </Link>
            ))}
          </nav>
        )}
        <h1>{title}</h1>
        {desc && <p className="ph-desc">{desc}</p>}
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </div>
  );
}

export type Tone = "neutral" | "blue" | "green" | "amber" | "red";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`bd bd-${tone}`}>{children}</span>;
}

/** Ortak durum: Bekliyor · Sürüyor · Tamamlandı · İlgi gerekiyor */
const WORK_TONE: Record<string, [string, Tone]> = {
  PENDING: ["Bekliyor", "neutral"],
  IN_PROGRESS: ["Sürüyor", "blue"],
  COMPLETED: ["Tamamlandı", "green"],
  ATTENTION: ["İlgi gerekiyor", "red"],
};
export function WorkBadge({ status }: { status: string }) {
  const [l, t] = WORK_TONE[status] ?? [status, "neutral"];
  return <Badge tone={t}>{l}</Badge>;
}

export function EmptyState({
  title,
  text,
  action,
  icon,
}: {
  title: string;
  text?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="empty">
      {icon && <div className="empty-ic">{icon}</div>}
      <b>{title}</b>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  pad = true,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  pad?: boolean;
}) {
  return (
    <section className={`pc${pad ? "" : " pc-flush"}`}>
      {(title || action) && (
        <header className="pc-h">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="st">
      <div className="st-l">{label}</div>
      <div className="st-v">{value}</div>
      {hint && <div className="st-h">{hint}</div>}
    </div>
  );
}

type Opt = { value: string; label: string };

/** GET formu: arama + seçmeli filtreler + sıralama. Mevcut diğer parametreler korunur. */
export function Toolbar({
  q,
  placeholder = "Ara",
  filters = [],
  keep = {},
  search = true,
}: {
  search?: boolean;
  q?: string;
  placeholder?: string;
  filters?: { name: string; label: string; value?: string; options: Opt[]; all?: string }[];
  keep?: Record<string, string | undefined>;
}) {
  return (
    <form className="tb" method="get" role="search">
      {Object.entries(keep).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      {search && (
        <label className="tb-q">
          <IconSearch size={16} />
          <span className="sr-only">{placeholder}</span>
          <input name="q" defaultValue={q} placeholder={placeholder} type="search" />
        </label>
      )}
      {filters.map((f) => (
        <label key={f.name} className="tb-f">
          <span className="sr-only">{f.label}</span>
          <select name={f.name} defaultValue={f.value ?? ""} aria-label={f.label}>
            <option value="">{f.all ?? `${f.label}: tümü`}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button type="submit" className="btn btn-o btn-sm">
        Uygula
      </button>
    </form>
  );
}

/** Sayfalama: önceki/sonraki + sayfa bilgisi */
export function Pager({
  page,
  pageSize,
  total,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize)
    return total ? (
      <div className="pg">
        <span>{total} kayıt</span>
      </div>
    ) : null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("sayfa", String(p));
    return `?${sp.toString()}`;
  };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav className="pg" aria-label="Sayfalama">
      <span>
        {from}–{to} / {total}
      </span>
      <div>
        {page > 1 ? (
          <Link className="btn btn-o btn-sm" href={href(page - 1)} rel="prev">
            Önceki
          </Link>
        ) : (
          <span className="btn btn-o btn-sm" aria-disabled>
            Önceki
          </span>
        )}
        <span className="pg-n">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link className="btn btn-o btn-sm" href={href(page + 1)} rel="next">
            Sonraki
          </Link>
        ) : (
          <span className="btn btn-o btn-sm" aria-disabled>
            Sonraki
          </span>
        )}
      </div>
    </nav>
  );
}

/** Sıralanabilir sütun başlığı (URL ?sirala=) */
export function SortTh({
  label,
  field,
  sort,
  params,
}: {
  label: string;
  field: string;
  sort?: string;
  params: Record<string, string | undefined>;
}) {
  const dir = sort === field ? "asc" : sort === `-${field}` ? "desc" : null;
  const next = dir === "desc" ? field : `-${field}`;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    if (v && k !== "sirala" && k !== "sayfa") sp.set(k, v);
  sp.set("sirala", next);
  return (
    <th aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}>
      <Link href={`?${sp.toString()}`} className="th-sort">
        {label}
        <span aria-hidden>{dir === "asc" ? "↑" : dir === "desc" ? "↓" : "↕"}</span>
      </Link>
    </th>
  );
}

export function Tabs({
  items,
  active,
}: {
  items: { key: string; label: string; href: string; count?: number }[];
  active: string;
}) {
  return (
    <nav className="tabs" aria-label="Sekmeler">
      {items.map((t) => (
        <Link key={t.key} href={t.href} aria-current={t.key === active ? "page" : undefined}>
          {t.label}
          {t.count ? <span>{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

/** URL arama parametrelerini tek değerli sözlüğe çevirir */
export function sp(raw: Record<string, string | string[] | undefined>) {
  const o: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) o[k] = Array.isArray(v) ? v[0] : v;
  return o;
}
export function pageNum(v?: string) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n < 10000 ? n : 1;
}

/** Yönlendirme sonrası tek seferlik sonuç mesajı (?sonuc=) */
export function Flash({ value, messages }: { value?: string; messages: Record<string, string> }) {
  const m = value ? messages[value] : undefined;
  if (!m) return null;
  return (
    <p className="alert-ok" role="status" style={{ marginBottom: 16 }}>
      {m}
    </p>
  );
}
