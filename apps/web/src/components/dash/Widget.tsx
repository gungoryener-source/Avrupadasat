import Link from "next/link";
import type { ReactNode } from "react";

/** Kart iskeleti: başlık + sağda tutarlı "Tümü →" bağlantısı */
export function ChartCard({
  title,
  href,
  hrefLabel = "Tümü",
  action,
  children,
  className = "",
  id,
}: {
  title: string;
  href?: string;
  hrefLabel?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const hid = id ? `${id}-h` : undefined;
  return (
    <section className={`wc ${className}`} aria-labelledby={hid}>
      <header className="wc-h">
        <h2 id={hid}>{title}</h2>
        <div className="wc-a">
          {action}
          {href && (
            <Link href={href} className="wc-link">
              {hrefLabel} <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

/** Boş durum: anlamlı mesaj + tek eylem */
export function DashEmpty({
  icon,
  title,
  text,
  cta,
  tone = "neutral",
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  cta?: { href: string; label: string };
  tone?: "neutral" | "positive";
}) {
  return (
    <div className={`de de-${tone}`}>
      {icon && <span className="de-ic">{icon}</span>}
      <b>{title}</b>
      {text && <p>{text}</p>}
      {cta && (
        <Link href={cta.href} className="btn btn-o btn-sm">
          {cta.label}
        </Link>
      )}
    </div>
  );
}

/** Hata durumu: widget tek başına çöker, sayfa çalışır; "Tekrar dene" sayfayı tazeler */
export function WidgetError({
  title,
  retryHref,
  w = { error: "Bu bölüm yüklenemedi", text: "Geçici bir sorun olabilir.", retry: "Tekrar dene" },
}: {
  title: string;
  retryHref: string;
  w?: { error: string; text: string; retry: string };
}) {
  return (
    <section className="wc wc-err" role="alert">
      <header className="wc-h">
        <h2>{title}</h2>
      </header>
      <div className="de">
        <b>{w.error}</b>
        <p>{w.text}</p>
        <Link href={retryHref} className="btn btn-o btn-sm" prefetch={false}>
          {w.retry}
        </Link>
      </div>
    </section>
  );
}

/** İskelet yükleyici (dönen simge yerine) */
export function Skeleton({
  rows = 3,
  chart = false,
  title,
}: {
  rows?: number;
  chart?: boolean;
  title?: string;
}) {
  return (
    <section
      className="wc"
      aria-busy="true"
      aria-label={title ? `${title} yükleniyor` : "Yükleniyor"}
    >
      <div className="sk sk-title" />
      {chart ? (
        <div className="sk sk-chart" />
      ) : (
        Array.from({ length: rows }, (_, i) => <div key={i} className="sk sk-row" />)
      )}
    </section>
  );
}
