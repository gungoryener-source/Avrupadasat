import Link from "next/link";
import { tokenIsValid } from "@/server/auth";
import { SetPasswordForm } from "../../forms";

export const metadata = { title: "Şifre belirle" };

export default async function SetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await tokenIsValid(token))) {
    return (
      <>
        <h1 style={{ marginTop: 0, fontSize: 22 }}>Bağlantı geçersiz</h1>
        <p className="muted">Bağlantının süresi dolmuş veya daha önce kullanılmış.</p>
        <Link href="/sifremi-unuttum">Yeni bağlantı iste</Link>
      </>
    );
  }
  return (
    <>
      <h1 style={{ marginTop: 0, fontSize: 22 }}>Şifrenizi belirleyin</h1>
      <SetPasswordForm token={token} />
    </>
  );
}
