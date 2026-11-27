import Link from "next/link";
import { can, ROLE_LABEL } from "@avrupadasat/core/roles";
import { fmtDate } from "@/components/AppShell";
import { Card, PageHeader } from "@/components/panel/ui";
import { db } from "@/server/db";
import { requireClient } from "@/server/session";

export const metadata = { title: "Ayarlar" };

export default async function SettingsPage() {
  const s = await requireClient();
  const u = await db().user.findUniqueOrThrow({
    where: { id: s.actor.userId },
    select: { email: true, name: true, twoFactorEnabledAt: true, lastLoginAt: true },
  });
  const members = await db().membership.count({ where: { tenantId: s.actor.tenantId } });
  return (
    <>
      <PageHeader title="Ayarlar" desc="Hesabınız, güvenlik, ekip ve bildirim tercihleri." />
      <div className="grid grid-2">
        <Card title="Hesap">
          <dl className="kv">
            <dt>Ad soyad</dt>
            <dd>{u.name}</dd>
            <dt>E-posta</dt>
            <dd>{u.email}</dd>
            <dt>Rol</dt>
            <dd>{ROLE_LABEL[s.actor.role]}</dd>
            <dt>Son giriş</dt>
            <dd>{fmtDate(u.lastLoginAt, true)}</dd>
          </dl>
        </Card>
        <Card title="Güvenlik">
          <dl className="kv">
            <dt>İki aşamalı doğrulama</dt>
            <dd>{u.twoFactorEnabledAt ? `Açık (${fmtDate(u.twoFactorEnabledAt)})` : "Kapalı"}</dd>
          </dl>
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <Link className="btn btn-o btn-sm" href="/hesap/2fa">
              2FA ayarları
            </Link>
            <Link className="btn btn-o btn-sm" href="/sifremi-unuttum">
              Şifre değiştir
            </Link>
          </div>
        </Card>
        <Card title="Ekip">
          <p className="muted" style={{ marginTop: 0 }}>
            Panelde {members} kullanıcı var.
          </p>
          {can(s.actor.role, "user.manage") ? (
            <Link className="btn btn-o btn-sm" href="/panel/kullanicilar">
              Kullanıcıları yönet
            </Link>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Kullanıcı ekleme yetkisi firma yöneticisindedir.
            </p>
          )}
        </Card>
        <Card title="Bildirimler">
          <p className="muted" style={{ marginTop: 0 }}>
            Uygulama içi bildirimler her zaman açıktır. Sizden işlem beklenen görevler, reddedilen
            belgeler, destek yanıtları, vergi son tarihleri ve senkronizasyon hataları ayrıca
            e-postayla gönderilir.
          </p>
          <Link className="btn btn-o btn-sm" href="/panel/bildirimler">
            Bildirim geçmişi
          </Link>
        </Card>
        <Card title="Veri ve hesap">
          <p className="muted" style={{ marginTop: 0 }}>
            Kişisel verileriniz ve hesap silme seçenekleri.
          </p>
          <Link className="btn btn-o btn-sm" href="/panel/hesap">
            Hesabım
          </Link>
        </Card>
      </div>
    </>
  );
}
