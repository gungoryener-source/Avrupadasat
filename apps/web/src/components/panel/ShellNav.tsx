"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import * as I from "../site/Icons";

const ICONS = {
  home: I.IconHome,
  building: I.IconBuilding,
  layers: I.IconLayers,
  receipt: I.IconReceipt,
  folder: I.IconFolder,
  box: I.IconBox,
  truck: I.IconTruck,
  cart: I.IconCart,
  return: I.IconReturn,
  plug: I.IconPlug,
  checklist: I.IconChecklist,
  lifebuoy: I.IconLifebuoy,
  card: I.IconCard,
  settings: I.IconSettings,
  users: I.IconUsers,
  file: I.IconFile,
  chart: I.IconChart,
  inbox: I.IconInbox,
  message: I.IconMessage,
  shield: I.IconShield,
  bell: I.IconBell,
} as const;
export type IconKey = keyof typeof ICONS;

export type NavItem = {
  href: string;
  label: string;
  icon: IconKey;
  badge?: number;
  exact?: boolean;
};
export type NavGroup = { title?: string; items: NavItem[] };

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Kenar menüsü: aktif bağlantı, mobilde çekmece (aç/kapat, Esc, sayfa değişince kapanır) */
export function ShellNav({ groups, children }: { groups: NavGroup[]; children?: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState(pathname);
  if (last !== pathname) {
    setLast(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  // En uzun eşleşen bağlantı aktif sayılır (ör. /admin ile /admin/destek)
  const flat = groups.flatMap((g) => g.items);
  const active = flat
    .filter((i) => isActive(pathname, i))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <>
      <button
        type="button"
        className="sh-burger"
        aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
        aria-expanded={open}
        aria-controls="sh-side"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <I.IconClose size={20} /> : <I.IconMenu size={20} />}
      </button>
      <div className="sh-scrim" data-open={open} onClick={() => setOpen(false)} aria-hidden />
      <aside id="sh-side" className="sh-side" data-open={open} aria-label="Panel menüsü">
        {children}
        <nav className="sh-nav">
          {groups.map((g, gi) => (
            <div key={gi} className="sh-group">
              {g.title && <div className="sh-gt">{g.title}</div>}
              {g.items.map((n) => {
                const Icon = ICONS[n.icon];
                const on = n.href === active;
                return (
                  <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}>
                    <Icon size={18} />
                    <span>{n.label}</span>
                    {n.badge ? (
                      <span className="sh-badge">{n.badge > 99 ? "99+" : n.badge}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
