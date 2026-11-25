import Link from "next/link";
import { LoginForm } from "../forms";

export const metadata = { title: "Giriş" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sifre?: string; hata?: string }>;
}) {
  const sp = await searchParams;
  return (
    <>
      <h1 style={{ marginTop: 0, fontSize: 22 }}>Giriş</h1>
      {sp.sifre === "ok" && <p className="alert-ok">Şifreniz kaydedildi. Giriş yapabilirsiniz.</p>}
      {sp.hata === "yetki" && (
        <p className="alert-err">Hesabınıza bağlı bir firma veya rol bulunamadı.</p>
      )}
      <LoginForm next={sp.next} />
      <p style={{ fontSize: 14, marginBottom: 0 }}>
        <Link href="/sifremi-unuttum">Şifremi unuttum</Link>
      </p>
    </>
  );
}
