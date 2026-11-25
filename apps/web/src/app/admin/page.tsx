import type { Metadata } from "next";
import { Logo } from "@avrupadasat/ui";

export const metadata: Metadata = { title: "Ekip paneli", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <main className="wrap" style={{ padding: "48px 20px" }}>
      <Logo />
      <div className="card" style={{ marginTop: 28 }}>
        <h1 style={{ marginTop: 0 }}>Ekip paneli</h1>
        <p className="muted">CRM, teklif ve audit log Aşama 1&apos;de eklenecek.</p>
      </div>
    </main>
  );
}
