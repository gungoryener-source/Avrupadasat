"use client";
/**
 * ⌘K / Ctrl+K komut paleti: sayfalar (menüden), siparişler, ürünler (SKU/ad/EAN), destek talepleri.
 * Ok tuşlarıyla gezilir, Enter ile açılır, Esc ile kapanır.
 */
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconSearch } from "../site/Icons";
import type { NavGroup } from "./ShellNav";

type Hit = { kind: string; title: string; sub?: string; href: string };
const KIND: Record<string, string> = {
  page: "Sayfa",
  order: "Sipariş",
  product: "Ürün",
  ticket: "Destek",
  tenant: "Firma",
};

export function CommandPalette({ groups }: { groups: NavGroup[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const [mac, setMac] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => input.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/ara?q=${encodeURIComponent(q.trim())}`, { signal: ctl.signal });
        const j = (await r.json()) as { hits: Hit[] };
        setRemote(j.hits ?? []);
      } catch {
        /* iptal veya ağ hatası: sayfa sonuçları yine gösterilir */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q]);

  const pages = useMemo(() => {
    const all = groups.flatMap((g) =>
      g.items.map((i) => ({ kind: "page", title: i.label, sub: g.title, href: i.href })),
    );
    const s = q.trim().toLocaleLowerCase("tr");
    return s
      ? all.filter((p) => p.title.toLocaleLowerCase("tr").includes(s)).slice(0, 6)
      : all.slice(0, 8);
  }, [groups, q]);
  const hits: Hit[] = [...pages, ...(q.trim().length >= 2 ? remote : [])];

  function go(h: Hit) {
    setOpen(false);
    setQ("");
    router.push(h.href);
  }

  return (
    <>
      <button
        type="button"
        className="sh-search"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <IconSearch size={16} />
        <span>Ara…</span>
        <kbd>{mac ? "⌘K" : "Ctrl K"}</kbd>
      </button>
      {open && (
        <div className="cmd-wrap" onClick={() => setOpen(false)}>
          <div
            className="cmd"
            role="dialog"
            aria-modal="true"
            aria-label="Ara ve git"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((i) => Math.min(hits.length - 1, i + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((i) => Math.max(0, i - 1));
              }
              if (e.key === "Enter" && hits[sel]) go(hits[sel]);
            }}
          >
            <div className="cmd-in">
              <IconSearch size={18} />
              <input
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSel(0);
                }}
                placeholder="Sipariş no, SKU, ürün veya sayfa ara"
                aria-label="Ara"
                role="combobox"
                aria-expanded="true"
                aria-controls="cmd-list"
                aria-activedescendant={hits[sel] ? `cmd-${sel}` : undefined}
              />
              <kbd>Esc</kbd>
            </div>
            <ul className="cmd-list" id="cmd-list" role="listbox">
              {hits.map((h, i) => (
                <li
                  key={`${h.kind}-${h.href}-${i}`}
                  id={`cmd-${i}`}
                  role="option"
                  aria-selected={i === sel}
                  className={i === sel ? "is-sel" : ""}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => go(h)}
                >
                  <span className="cmd-k">{KIND[h.kind] ?? h.kind}</span>
                  <span className="cmd-t">{h.title}</span>
                  {h.sub && <span className="cmd-s">{h.sub}</span>}
                </li>
              ))}
              {hits.length === 0 && (
                <li className="cmd-empty" role="option" aria-selected="false">
                  {loading ? "Aranıyor…" : "Sonuç yok"}
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
