import Link from "next/link";
import { brand } from "@avrupadasat/core/brand.config";
import { Logo } from "@avrupadasat/ui";
import { ConsentSettingsLink } from "@/components/consent";
import { services } from "@/content/services";
import { IconMail } from "./Icons";
import { MobileNav } from "./MobileNav";
import { RevealObserver } from "./Reveal";

export const NAV = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/#hizmetler", label: "Hizmetler" },
  { href: "/#nasil-calisir", label: "Nasıl Çalışır?" },
  { href: "/fiyatlar", label: "Fiyatlandırma" },
  { href: "/sss", label: "SSS" },
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap site-header__in">
        <Link href="/" aria-label={`${brand.name} ana sayfa`} className="site-header__logo">
          <Logo tagline={false} />
        </Link>
        <nav aria-label="Ana menü" className="site-nav">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__actions">
          <Link href="/giris" className="site-header__login">
            Giriş Yap
          </Link>
          <Link href="/ucretsiz-uygunluk-raporu" className="btn btn-sm">
            Ücretsiz Rapor Al
          </Link>
        </div>
        <MobileNav items={NAV.map((n) => ({ href: n.href, label: n.label }))} />
      </div>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <Logo inverted />
            <p className="site-footer__slogan">{brand.slogan}</p>
            <p className="site-footer__note">{brand.independenceNotice}</p>
            <a className="site-footer__mail" href={`mailto:${brand.contact.email}`}>
              <IconMail size={18} />
              {brand.contact.email}
            </a>
          </div>
          <div>
            <h2 className="site-footer__h">Hizmetler</h2>
            {services
              .filter((s) => s.slug !== "e-ihracat-destek-rehberi")
              .map((s) => (
                <Link key={s.slug} href={`/${s.slug}`}>
                  {s.kicker}
                </Link>
              ))}
          </div>
          <div>
            <h2 className="site-footer__h">Kurumsal</h2>
            <Link href="/#nasil-calisir">Nasıl çalışır?</Link>
            <Link href="/fiyatlar">Fiyatlandırma</Link>
            <Link href="/rehber">Rehberler</Link>
            <Link href="/e-ihracat-destek-rehberi">E-ihracat destekleri</Link>
            <Link href="/sss">Sık sorulan sorular</Link>
            <Link href="/iletisim">İletişim</Link>
            <Link href="/giris">Müşteri girişi</Link>
          </div>
          <div>
            <h2 className="site-footer__h">Hukuki</h2>
            <Link href="/kvkk">KVKK aydınlatma metni</Link>
            <Link href="/gizlilik">Gizlilik politikası</Link>
            <Link href="/cerezler">Çerez politikası</Link>
            <Link href="/hizmet-sartlari">Hizmet şartları</Link>
            <Link href="/impressum">Impressum</Link>
            <Link href="/hesap-silme">Hesap silme</Link>
            <ConsentSettingsLink />
          </div>
        </div>
        <div className="site-footer__bar">
          <span>
            © {year} {brand.name}
          </span>
          <span>Fiyatlar KDV hariçtir. Üçüncü taraf masrafları faturasıyla yansıtılır.</span>
        </div>
      </div>
    </footer>
  );
}

export function SitePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <a href="#icerik" className="skip">
        İçeriğe geç
      </a>
      <SiteHeader />
      <main id="icerik">{children}</main>
      <SiteFooter />
      <RevealObserver />
    </div>
  );
}
