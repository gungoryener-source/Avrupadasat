import { redirect } from "next/navigation";
import { currentSession } from "@/server/session";
import { TwoFactorSetup } from "../../forms";

export const metadata = { title: "2FA kurulumu" };

export default async function TwoFactorSetupPage() {
  const s = await currentSession();
  if (!s) redirect("/giris");
  if (!s.twoFactorPassed) redirect("/giris/2fa");
  return (
    <>
      <h1 style={{ marginTop: 0, fontSize: 22 }}>İki adımlı doğrulamayı kurun</h1>
      {s.twoFactorEnabled ? (
        <p className="alert-ok">2FA etkin. Yeniden kurarsanız eski kod geçersiz olur.</p>
      ) : (
        <p className="muted">Ekip ve firma yöneticisi hesaplarında zorunludur.</p>
      )}
      <TwoFactorSetup />
    </>
  );
}
