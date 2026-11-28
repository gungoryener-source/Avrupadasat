import { Fragment } from "react";
import { PERMISSIONS, ROLE_LABEL, can, type Role } from "@avrupadasat/core/roles";
import { fmtDate } from "@/components/AppShell";
import { ActionForm } from "@/components/panel/ActionForm";
import { Badge, Card, PageHeader } from "@/components/panel/ui";
import { Submit } from "@/components/Submit";
import { requireStaff } from "@/server/session";
import { listStaff, STAFF_ROLE_OPTIONS } from "@/server/staff";
import { inviteStaffAction, staffDisableAction, staffRoleAction } from "../portal-actions";

export const metadata = { title: "Personel ve yetkiler" };

const ROLE_DESC: Record<string, string> = {
  ADMIN: "Tüm yetkiler, personel ve fiyat yönetimi",
  MANAGER: "Personel ve fiyat yönetimi hariç tüm modüller",
  OPS: "Müşteri operasyonu, sevkiyat, stok, belge onayı, görevler",
  FINANCE: "Fatura, abonelik, vergi takvimi",
  SALES: "Başvurular ve teklifler",
  SUPPORT: "Destek talepleri ve alıcı mesajları",
  PARTNER: "Yalnız atandığı firmaların depo ve sipariş işleri",
};

export default async function StaffPage() {
  const s = await requireStaff("staff.manage");
  const staff = await listStaff();
  return (
    <>
      <PageHeader
        title="Personel ve yetkiler"
        desc="Rol değişikliğinde kişinin açık oturumları kapanır. Tüm değişiklikler denetim kaydına yazılır."
      />
      <div className="grid">
        <div className="tw">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th>Kişi</th>
                <th>Rol</th>
                <th>Güvenlik</th>
                <th>Son giriş</th>
                <th>Hesap</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => {
                const self = u.id === s.actor.userId;
                return (
                  <tr key={u.id}>
                    <td>
                      <b style={{ fontWeight: 500 }}>{u.name}</b>
                      {self && <span className="muted"> (siz)</span>}
                      <div className="muted" style={{ fontSize: 12 }}>
                        {u.email}
                      </div>
                    </td>
                    <td data-l="Rol">
                      {self ? (
                        ROLE_LABEL[u.staffRole as Role]
                      ) : (
                        <ActionForm
                          action={staffRoleAction}
                          className="form row-actions"
                          resetOnOk={false}
                        >
                          <input type="hidden" name="userId" value={u.id} />
                          <select
                            name="role"
                            defaultValue={u.staffRole ?? ""}
                            aria-label={`${u.name} rolü`}
                          >
                            {STAFF_ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </option>
                            ))}
                          </select>
                          <Submit className="btn btn-o btn-sm" pendingText="…">
                            Kaydet
                          </Submit>
                        </ActionForm>
                      )}
                    </td>
                    <td data-l="Güvenlik">
                      {!u.passwordHash ? (
                        <Badge tone="amber">Davet bekliyor</Badge>
                      ) : u.twoFactorEnabledAt ? (
                        <Badge tone="green">2FA açık</Badge>
                      ) : (
                        <Badge tone="red">2FA kurulmadı</Badge>
                      )}
                    </td>
                    <td data-l="Son giriş">{u.lastLoginAt ? fmtDate(u.lastLoginAt, true) : "—"}</td>
                    <td data-l="Hesap">
                      {self ? (
                        <Badge tone="green">Aktif</Badge>
                      ) : (
                        <ActionForm
                          action={staffDisableAction}
                          className="form row-actions"
                          resetOnOk={false}
                        >
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="disable" value={u.disabledAt ? "0" : "1"} />
                          {u.disabledAt ? (
                            <Badge tone="neutral">Kapalı</Badge>
                          ) : (
                            <Badge tone="green">Aktif</Badge>
                          )}
                          <Submit className="btn btn-o btn-sm" pendingText="…">
                            {u.disabledAt ? "Yeniden aç" : "Kapat"}
                          </Submit>
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <Card title="Ekip üyesi davet et">
            <ActionForm action={inviteStaffAction}>
              <div className="field">
                <label htmlFor="inv-name">Ad soyad</label>
                <input id="inv-name" name="name" required maxLength={120} />
              </div>
              <div className="field">
                <label htmlFor="inv-email">E-posta</label>
                <input id="inv-email" name="email" type="email" required maxLength={254} />
              </div>
              <div className="field">
                <label htmlFor="inv-role">Rol</label>
                <select id="inv-role" name="role" defaultValue="SUPPORT">
                  {STAFF_ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                Davet bağlantısı 72 saat geçerlidir. Ekip üyeleri ilk girişte 2FA kurmak zorundadır.
              </p>
              <div>
                <Submit pendingText="Gönderiliyor…">Davet gönder</Submit>
              </div>
            </ActionForm>
          </Card>
          <Card title="Roller">
            <dl className="kv">
              {STAFF_ROLE_OPTIONS.map((r) => (
                <Fragment key={r}>
                  <dt>{ROLE_LABEL[r]}</dt>
                  <dd>
                    {ROLE_DESC[r]}
                    <div className="muted" style={{ fontSize: 12 }}>
                      {PERMISSIONS.filter((p) => can(r, p)).length} yetki
                    </div>
                  </dd>
                </Fragment>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
