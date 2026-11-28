"use client";
/** Sipariş detay çekmecesi: Esc ve arka plan tıklamasıyla kapanır, odak çekmeceye taşınır */
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { IconClose } from "@/components/site/Icons";

export function OrderDrawer({
  closeHref,
  title,
  closeLabel = "Kapat",
  children,
}: {
  closeHref: string;
  title: string;
  closeLabel?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(closeHref, { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [closeHref, router]);
  return (
    <>
      <div
        className="drw-scrim"
        aria-hidden="true"
        onClick={() => router.push(closeHref, { scroll: false })}
      />
      <aside
        className="drw"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <header className="drw-h">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={closeLabel}
            onClick={() => router.push(closeHref, { scroll: false })}
          >
            <IconClose size={18} />
          </button>
        </header>
        <div className="drw-b">{children}</div>
      </aside>
    </>
  );
}
