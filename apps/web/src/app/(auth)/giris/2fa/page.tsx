import { redirect } from "next/navigation";
import { currentSession } from "@/server/session";
import { TwoFactorForm } from "../../forms";

export const metadata = { title: "İki adımlı doğrulama" };

export default async function TwoFactorPage() {
  const s = await currentSession();
  if (!s) redirect("/giris");
  if (s.twoFactorPassed) redirect("/admin");
  return (
    <>
      <h1 style={{ marginTop: 0, fontSize: 22 }}>İki adımlı doğrulama</h1>
      <p className="muted">Doğrulama uygulamanızdaki 6 haneli kodu yazın.</p>
      <TwoFactorForm />
    </>
  );
}
