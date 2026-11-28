import Link from "next/link";
import { Logo } from "@avrupadasat/ui";
import { logoutAction } from "@/app/(auth)/actions";
import { setLocaleAction } from "@/app/locale-actions";
import { LOCALE_NAME, LOCALES, type Locale } from "@/i18n/dict";
import { CommandPalette } from "./panel/CommandPalette";
import { ShellCrumb, ShellNav, type NavGroup } from "./panel/ShellNav";
import { IconBell, IconHelp, IconLogout, IconShield } from "./site/Icons";

export type { NavGroup };

export type ShellStrings = {
  plan: string;
  help: string;
  security: string;
  logout: string;
  notifications: string;
  unread: string; // {n}
  language: string;
  languageNote: string;
  search: string;
  searchPlaceholder: string;
  searching: string;
  noResults: string;
  kinds: Record<string, string>;
  collapse: string;
  expand: string;
  collapseLong: string;
  menuOpen: string;
  menuClose: string;
};

const TR_SHELL: ShellStrings = {
  plan: "Paketiniz",
  help: "Yardım ve destek",
  security: "Güvenlik (2FA)",
  logout: "Çıkış yap",
  notifications: "Bildirimler",
  unread: "{n} okunmamış",
  language: "Dil",
  languageNote: "",
  search: "Ara…",
  searchPlaceholder: "Sipariş no, SKU, ürün veya sayfa ara",
  searching: "Aranıyor…",
  noResults: "Sonuç yok",
  kinds: { page: "Sayfa", order: "Sipariş", product: "Ürün", ticket: "Destek", tenant: "Firma" },
  collapse: "Daralt",
  expand: "Menüyü genişlet",
  collapseLong: "Menüyü daralt",
  menuOpen: "Menüyü aç",
  menuClose: "Menüyü kapat",
};

/**
 * Panel kabuğu (müşteri ve ekip): lacivert kenar menüsü, üst çubukta bildirim zili ve kullanıcı.
 * `nav` düz liste olarak da verilebilir (geriye uyum).
 */
export function AppShell({
  nav,
  groups,
  user,
  subtitle,
  unread = 0,
  bellHref,
  home = "/panel",
  context,
  root = "Panel",
  plan,
  helpHref,
  strings = TR_SHELL,
  locale,
  children,
}: {
  root?: string;
  /** Kenar menüsü altındaki plan kartı */
  plan?: { name: string; href: string; cta?: string };
  helpHref?: string;
  /** Arayüz metinleri (müşteri paneli çevrilir; ekip paneli Türkçe) */
  strings?: ShellStrings;
  locale?: Locale;
  nav?: { href: string; label: string }[];
  groups?: NavGroup[];
  user: string;
  subtitle: string;
  unread?: number;
  bellHref?: string;
  home?: string;
  context?: string;
  children: React.ReactNode;
}) {
  const g: NavGroup[] = groups ?? [
    { items: (nav ?? []).map((n) => ({ ...n, icon: "home" as const })) },
  ];
  const initials = user
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="app app2" lang={locale}>
      <ShellNav
        groups={g}
        labels={{
          collapse: strings.collapse,
          expand: strings.expand,
          collapseLong: strings.collapseLong,
          menuOpen: strings.menuOpen,
          menuClose: strings.menuClose,
        }}
        footer={
          <>
            {plan && (
              <Link href={plan.href} className="sh-plan">
                <small>{strings.plan}</small>
                <b className="sh-lbl">{plan.name}</b>
                {plan.cta && <span className="sh-lbl sh-plan-cta">{plan.cta} →</span>}
              </Link>
            )}
            {helpHref && (
              <Link href={helpHref} className="sh-help" title={strings.help}>
                <IconHelp size={18} />
                <span className="sh-lbl">{strings.help}</span>
              </Link>
            )}
          </>
        }
      >
        <Link href={home} className="sh-logo" aria-label="Panel ana sayfası">
          <Logo inverted tagline={false} />
        </Link>
        {context && (
          <div className="sh-context" title={context}>
            <span className="sh-co" aria-hidden="true">
              {context
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toLocaleUpperCase("tr")}
            </span>
            <span className="sh-lbl">{context}</span>
          </div>
        )}
      </ShellNav>
      <div className="sh-body">
        <header className="sh-top">
          <div className="sh-top__ctx">
            <ShellCrumb groups={g} root={root} />
          </div>
          <div className="sh-top__right">
            <CommandPalette groups={g} s={strings} />
            {bellHref && (
              <Link
                href={bellHref}
                className="sh-bell"
                aria-label={
                  unread
                    ? `${strings.notifications}, ${strings.unread.replace("{n}", String(unread))}`
                    : strings.notifications
                }
              >
                <IconBell size={20} />
                {unread > 0 && <span>{unread > 99 ? "99+" : unread}</span>}
              </Link>
            )}
            <details className="sh-user">
              <summary>
                <span className="sh-avatar" aria-hidden>
                  {initials}
                </span>
                <span className="sh-user__txt">
                  <b>{user}</b>
                  <small>{subtitle}</small>
                </span>
              </summary>
              <div className="sh-menu">
                {locale && (
                  <form action={setLocaleAction} className="sh-lang" aria-label={strings.language}>
                    <span className="sh-lang-l">{strings.language}</span>
                    <div className="sh-lang-b">
                      {LOCALES.map((l) => (
                        <button
                          key={l}
                          type="submit"
                          name="locale"
                          value={l}
                          aria-pressed={l === locale}
                          lang={l}
                          title={LOCALE_NAME[l]}
                        >
                          {l.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    {strings.languageNote && <small>{strings.languageNote}</small>}
                  </form>
                )}
                <Link href="/hesap/2fa">
                  <IconShield size={16} /> {strings.security}
                </Link>
                <form action={logoutAction}>
                  <button type="submit">
                    <IconLogout size={16} /> {strings.logout}
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>
        <main className="main sh-main" id="icerik">
          {children}
        </main>
      </div>
    </div>
  );
}

export function fmtDate(d: Date | null | undefined, withTime = false) {
  if (!d) return "—";
  return withTime
    ? d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
    : d.toLocaleDateString("tr-TR");
}
