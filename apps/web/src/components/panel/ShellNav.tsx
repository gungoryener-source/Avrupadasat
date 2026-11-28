"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import * as I from "../site/Icons";

const ICONS = {
  home: I.IconHome,
  building: I.IconBuilding,
  layers: I.IconLayers,
  receipt: I.IconReceipt,
  folder: I.IconFolder,
  box: I.IconBox,
  scan: I.IconScan,
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
  help: I.IconHelp,
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

const COLLAPSE_KEY = "avs:side-collapsed";
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function activeItem(groups: NavGroup[], pathname: string) {
  // En uzun eşleşen bağlantı aktif sayılır (ör. /admin ile /admin/destek)
  const flat = groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.title })));
  return flat.filter((i) => isActive(pathname, i)).sort((a, b) => b.href.length - a.href.length)[0];
}

/** Üst çubuktaki konum: Grup / Sayfa */
export function ShellCrumb({ groups, root }: { groups: NavGroup[]; root: string }) {
  const pathname = usePathname();
  const a = activeItem(groups, pathname);
  const deeper = a && pathname !== a.href;
  return (
    <nav className="sh-crumb" aria-label="Sayfa yolu">
      <span>{root}</span>
      {a?.group && (
        <>
          <span aria-hidden="true">/</span>
          <span>{a.group}</span>
        </>
      )}
      {a && (
        <>
          <span aria-hidden="true">/</span>
          {deeper ? <Link href={a.href}>{a.label}</Link> : <b aria-current="page">{a.label}</b>}
        </>
      )}
    </nav>
  );
}

/** Kenar menüsü: aktif bağlantı, daraltılabilir ikon modu, mobilde çekmece (Esc, sayfa değişince kapanır) */
export function ShellNav({
  groups,
  children,
  footer,
  labels = {
    collapse: "Daralt",
    expand: "Menüyü genişlet",
    collapseLong: "Menüyü daralt",
    menuOpen: "Menüyü aç",
    menuClose: "Menüyü kapat",
  },
}: {
  groups: NavGroup[];
  children?: React.ReactNode;
  footer?: React.ReactNode;
  labels?: {
    collapse: string;
    expand: string;
    collapseLong: string;
    menuOpen: string;
    menuClose: string;
  };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const toggle = () => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "0" : "1");
    } catch {
      /* yok say */
    }
    listeners.forEach((l) => l());
  };
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
  const active = activeItem(groups, pathname)?.href;
  return (
    <>
      <button
        type="button"
        className="sh-burger"
        aria-label={open ? labels.menuClose : labels.menuOpen}
        aria-expanded={open}
        aria-controls="sh-side"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <I.IconClose size={20} /> : <I.IconMenu size={20} />}
      </button>
      <div className="sh-scrim" data-open={open} onClick={() => setOpen(false)} aria-hidden />
      <aside
        id="sh-side"
        className="sh-side"
        data-open={open}
        data-collapsed={collapsed}
        aria-label="Panel menüsü"
      >
        {children}
        <nav className="sh-nav">
          {groups.map((g, gi) => (
            <div key={gi} className="sh-group">
              {g.title && <div className="sh-gt">{g.title}</div>}
              {g.items.map((n) => {
                const Icon = ICONS[n.icon];
                const on = n.href === active;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={on ? "page" : undefined}
                    title={collapsed ? n.label : undefined}
                  >
                    <Icon size={18} />
                    <span className="sh-lbl">{n.label}</span>
                    {n.badge ? (
                      <span className="sh-badge">{n.badge > 99 ? "99+" : n.badge}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sh-foot">
          {footer}
          <button
            type="button"
            className="sh-collapse"
            onClick={toggle}
            aria-pressed={collapsed}
            aria-label={collapsed ? labels.expand : labels.collapseLong}
            title={collapsed ? labels.expand : labels.collapseLong}
          >
            <I.IconSidebar size={18} />
            <span className="sh-lbl">{labels.collapse}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
