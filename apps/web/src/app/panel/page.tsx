import type { Metadata } from "next";
import { Logo } from "@avrupadasat/ui";

export const metadata: Metadata = {
  title: "Müşteri paneli",
  robots: { index: false, follow: false },
};

export default function PanelPage() {
  return (
    <main className="wrap" style={{ padding: "48px 20px" }}>
      <Logo />
      <div className="card" style={{ marginTop: 28 }}>
        <h1 style={{ marginTop: 0 }}>Müşteri paneli</h1>
        <p className="muted">
          Giriş, stok, sevkiyat ve şirket kurulum takibi Aşama 1 ve 3&apos;te eklenecek.
        </p>
      </div>
    </main>
  );
}
