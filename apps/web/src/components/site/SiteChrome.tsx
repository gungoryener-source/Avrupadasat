import Link from "next/link";
import { brand } from "@avrupadasat/core/brand.config";
import { Logo } from "@avrupadasat/ui";
import { ConsentSettingsLink } from "@/components/consent";
import { services } from "@/content/services";

const NAV = [
  { href: "/#hizmetler", label: "Hizmetler" },
  { href: "/fiyatlar", label: "Fiyatlar" },
  { href: "/rehber", label: "Rehberler" },
  { href: "/sss", label: "SSS" },
];

export function SiteHeader() {
  return (
    <header className="wrap nav">
      <Link href="/" aria-label={`${brand.name} ana sayfa`} style={{ textDecoration: "none" }}>
        <Logo />
      </Link>
      <nav aria-label="Ana menü" className="nav-links">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}>
            {n.label}
          </Link>
        ))}
        <Link href="/giris">Müşteri girişi</Link>
        <Link href="/ucretsiz-uygunluk-raporu" className="btn btn-sm">
          Ücretsiz rapor
        </Link>
      </nav>
      <details className="nav-mobile">
        <summary aria-label="Menüyü aç">Menü</summary>
        <div>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
          <Link href="/giris">Müşteri girişi</Link>
          <Link href="/ucretsiz-uygunluk-raporu">Ücretsiz rapor</Link>
        </div>
      </details>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="wrap foot">
        <div>
          <Logo inverted />
          <p style={{ marginTop: 14, maxWidth: 380 }}>{brand.independenceNotice}</p>
        </div>
        <div>
          <b>Hizmetler</b>
          {services.slice(0, 6).map((s) => (
            <Link key={s.slug} href={`/${s.slug}`}>
              {s.kicker}
            </Link>
          ))}
        </div>
        <div>
          <b>Kurumsal</b>
          <Link href="/fiyatlar">Fiyatlar</Link>
          <Link href="/rehber">Rehberler</Link>
          <Link href="/sss">SSS</Link>
          <Link href="/iletisim">İletişim</Link>
        </div>
        <div>
          <b>Hukuki</b>
          <Link href="/kvkk">KVKK</Link>
          <Link href="/gizlilik">Gizlilik</Link>
          <Link href="/cerezler">Çerezler</Link>
          <Link href="/hizmet-sartlari">Hizmet şartları</Link>
          <Link href="/impressum">Impressum</Link>
          <ConsentSettingsLink />
        </div>
      </div>
    </footer>
  );
}

export function SitePage({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#icerik" className="skip">
        İçeriğe geç
      </a>
      <SiteHeader />
      <main id="icerik">{children}</main>
      <SiteFooter />
    </>
  );
}
