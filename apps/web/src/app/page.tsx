import { brand, formatEur, operations, packages } from "@avrupadasat/core";
import { ButtonLink, Logo } from "@avrupadasat/ui";

/**
 * Aşama 0 iskelet ana sayfa. Tam site (önizlemedeki tüm bölümler) Aşama 2'de.
 * Fiyatlar packages/core/src/pricing.ts'ten gelir — sayfada sabit fiyat yazılmaz.
 */
export default function HomePage() {
  const steps = [
    ["Formu doldurun", "48 saat içinde ücretsiz Avrupa uygunluk raporunuz hazır."],
    ["Teklifi onaylayın", "Şirket, depo ve satış kanalı planı tek teklifte."],
    ["Satışa başlayın", "Malınız Almanya deposunda, siparişler panelinizde."],
  ];

  return (
    <>
      <div className="wrap">
        <header className="nav">
          <Logo />
          <nav aria-label="Ana menü">
            <a href="#paketler">Paketler</a>
            <a href="/panel">Müşteri girişi</a>
          </nav>
        </header>
      </div>

      <main>
        <section className="hero">
          <div className="wrap">
            <span className="badge">İhracatçı firmalar için</span>
            <h1>{brand.heroTitle}</h1>
            <p>
              Almanya&apos;da şirketiniz, deponuz, gümrüğünüz ve satışınız: tek ekip, Türkçe, şeffaf
              fiyat.
            </p>
            <div className="row">
              <ButtonLink href="#rapor">Ücretsiz uygunluk raporu al</ButtonLink>
              <ButtonLink href="#paketler" variant="outline">
                Paketleri gör
              </ButtonLink>
            </div>
          </div>
        </section>

        <section id="rapor">
          <div className="wrap">
            <div className="k">Nasıl çalışır</div>
            <h2>3 adımda Avrupa&apos;da satış</h2>
            <ol className="grid3" style={{ listStyle: "none", padding: 0 }}>
              {steps.map(([t, d], i) => (
                <li key={t} className="card">
                  <span className="badge">{i + 1}</span>
                  <h3 style={{ marginTop: 10 }}>{t}</h3>
                  <p className="muted">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="paketler">
          <div className="wrap">
            <div className="k">Paketler</div>
            <h2>Şeffaf fiyat</h2>
            <div className="grid3">
              <div className="card">
                <h3>{packages.BASLANGIC.name}</h3>
                <div className="price">
                  {formatEur(packages.BASLANGIC.oneTime.UG)}
                  <small>&apos;dan · tek sefer</small>
                </div>
                <p className="muted">Almanya&apos;ya gitmeden UG/GmbH kuruluşu ve vergi kaydı.</p>
              </div>
              <div className="card">
                <h3>{packages.OPERASYON.name}</h3>
                <div className="price">
                  {formatEur(packages.OPERASYON.monthly)}
                  <small>/ay + kuruluş</small>
                </div>
                <p className="muted">Sanal ofis, muhasebe, stok ve sevkiyat yazılımı.</p>
              </div>
              <div className="card" style={{ borderColor: "var(--p)" }}>
                <h3>{packages.PAZARA_GIRIS.name}</h3>
                <div className="price">
                  {formatEur(packages.PAZARA_GIRIS.monthly)}
                  <small>&apos;dan/ay</small>
                </div>
                <p className="muted">
                  Depo, gümrük takibi, Amazon.de/eBay.de ve Almanca pazarlama.
                </p>
              </div>
            </div>
            <p className="muted" style={{ fontSize: 14, marginTop: 16 }}>
              Depolama {formatEur(operations.storagePerPalletMonth)}/palet/ay · Kurulum ücreti yok ·
              Aylık fesih. Fiyatlar taslaktır.
            </p>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <Logo inverted />
          <p style={{ marginTop: 14 }}>{brand.independenceNotice}</p>
        </div>
      </footer>
    </>
  );
}
