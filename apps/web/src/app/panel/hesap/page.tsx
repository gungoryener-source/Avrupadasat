import Link from "next/link";
import { db } from "@/server/db";
import { requireClient } from "@/server/session";
import { DeleteAccountForm } from "./DeleteForm";

export const metadata = { title: "Hesabım" };

export default async function AccountPage() {
  const s = await requireClient(undefined, "/panel/hesap");
  const user = await db().user.findUniqueOrThrow({
    where: { id: s.userId },
    select: { name: true, email: true, twoFactorEnabledAt: true },
  });
  const lastOwner =
    s.actor.role === "CLIENT_OWNER" &&
    (await db().membership.count({
      where: {
        tenantId: s.actor.tenantId,
        role: "CLIENT_OWNER",
        userId: { not: s.userId },
        user: { disabledAt: null },
      },
    })) === 0;
  return (
    <>
      <h1>Hesabım</h1>
      <div className="card" style={{ marginBottom: 24 }}>
        <p>
          <b>{user.name}</b>
          <br />
          <span className="muted">{user.email}</span>
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          İki adımlı doğrulama: {user.twoFactorEnabledAt ? "açık" : "kapalı"}
        </p>
      </div>

      <h2 id="sil">Hesabımı sil</h2>
      <p>
        Adınız, e-posta adresiniz, parolanız, oturumlarınız ve mobil cihaz kayıtlarınız silinir.
        Firmanıza ait faturalar, sevkiyat ve sipariş kayıtları yasal saklama süreleri boyunca
        firmada kalabilir. Ayrıntılar: <Link href="/hesap-silme">Hesap silme</Link>.
      </p>
      {lastOwner && (
        <p className="alert-warn" role="note">
          Firmanın tek yetkilisi sizsiniz. Hesabınız silindikten sonra firma kaydının kapatılması
          veya yeni bir yetkili atanması için ekibimiz sizinle iletişime geçer. Önce “Kullanıcılar”
          sayfasından başka bir yetkili davet etmeniz önerilir.
        </p>
      )}
      <DeleteAccountForm needsCode={Boolean(user.twoFactorEnabledAt)} />
    </>
  );
}
