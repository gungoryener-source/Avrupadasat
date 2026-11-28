import Link from "next/link";
import { Logo } from "@avrupadasat/ui";
import { logoutAction } from "@/app/(auth)/actions";
import { CommandPalette } from "./panel/CommandPalette";
import { ShellCrumb, ShellNav, type NavGroup } from "./panel/ShellNav";
import { IconBell, IconHelp, IconLogout, IconShield } from "./site/Icons";

export type { NavGroup };

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
  children,
}: {
  root?: string;
  /** Kenar menüsü altındaki plan kartı */
  plan?: { name: string; href: string; cta?: string };
  helpHref?: string;
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
    <div className="app app2">
      <ShellNav
        groups={g}
        footer={
          <>
            {plan && (
              <Link href={plan.href} className="sh-plan">
                <small>Paketiniz</small>
                <b className="sh-lbl">{plan.name}</b>
                {plan.cta && <span className="sh-lbl sh-plan-cta">{plan.cta} →</span>}
              </Link>
            )}
            {helpHref && (
              <Link href={helpHref} className="sh-help" title="Yardım ve destek">
                <IconHelp size={18} />
                <span className="sh-lbl">Yardım ve destek</span>
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
            <CommandPalette groups={g} />
            {bellHref && (
              <Link
                href={bellHref}
                className="sh-bell"
                aria-label={unread ? `Bildirimler, ${unread} okunmamış` : "Bildirimler"}
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
                <Link href="/hesap/2fa">
                  <IconShield size={16} /> Güvenlik (2FA)
                </Link>
                <form action={logoutAction}>
                  <button type="submit">
                    <IconLogout size={16} /> Çıkış yap
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
