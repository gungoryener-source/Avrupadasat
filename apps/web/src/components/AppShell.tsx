import Link from "next/link";
import { Logo } from "@avrupadasat/ui";
import { logoutAction } from "@/app/(auth)/actions";

export function AppShell({
  nav,
  user,
  subtitle,
  children,
}: {
  nav: { href: string; label: string }[];
  user: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app">
      <aside className="side" aria-label="Panel menüsü">
        <div style={{ padding: "0 6px 18px" }}>
          <Logo inverted />
        </div>
        {nav.map((n) => (
          <Link key={n.href} href={n.href}>
            {n.label}
          </Link>
        ))}
        <div className="sep">
          <div style={{ color: "#fff", fontWeight: 700 }}>{user}</div>
          <div>{subtitle}</div>
          <Link href="/hesap/2fa" style={{ padding: "6px 0", display: "inline-block" }}>
            Güvenlik (2FA)
          </Link>
          <form action={logoutAction}>
            <button className="btn btn-o btn-sm" type="submit" style={{ marginTop: 8 }}>
              Çıkış
            </button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

export function fmtDate(d: Date | null | undefined, withTime = false) {
  if (!d) return "—";
  return withTime
    ? d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
    : d.toLocaleDateString("tr-TR");
}
