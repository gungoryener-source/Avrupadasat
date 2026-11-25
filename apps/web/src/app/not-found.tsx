import { ButtonLink } from "@avrupadasat/ui";

export default function NotFound() {
  return (
    <main className="wrap" style={{ padding: "80px 20px", textAlign: "center" }}>
      <h1>Sayfa bulunamadı</h1>
      <p className="muted">Aradığınız sayfa taşınmış veya kaldırılmış olabilir.</p>
      <ButtonLink href="/">Ana sayfaya dön</ButtonLink>
    </main>
  );
}
