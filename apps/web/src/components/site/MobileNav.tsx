"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { IconArrowRight, IconClose, IconMenu } from "./Icons";

/** Mobil menü: tam ekran panel, Esc ile kapanır, sayfa değişince kapanır, arka plan kaymaz */
export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const id = useId();

  // Sayfa değişince menüyü kapat
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="mnav">
      <button
        type="button"
        className="mnav__toggle"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <IconClose size={22} /> : <IconMenu size={22} />}
      </button>
      <div id={id} className="mnav__panel" data-open={open} hidden={!open}>
        <nav aria-label="Mobil menü">
          {items.map((n, i) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              style={{ animationDelay: `${40 + i * 30}ms` }}
            >
              {n.label}
              <IconArrowRight size={18} />
            </Link>
          ))}
        </nav>
        <div className="mnav__actions">
          <Link href="/ucretsiz-uygunluk-raporu" className="btn" onClick={() => setOpen(false)}>
            Ücretsiz Rapor Al
          </Link>
          <Link href="/giris" className="btn btn-o" onClick={() => setOpen(false)}>
            Giriş Yap
          </Link>
        </div>
      </div>
    </div>
  );
}
