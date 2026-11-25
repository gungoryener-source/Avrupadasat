import { can } from "@avrupadasat/core/roles";
import { forTenant } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { Submit } from "@/components/Submit";
import { db } from "@/server/db";
import { requireClient } from "@/server/session";
import { removeMemberAction } from "../actions";
import { InviteForm } from "../forms";

export const metadata = { title: "Kullanıcılar" };

export default async function UsersPage() {
  const s = await requireClient();
  const manage = can(s.actor.role, "user.manage");
  const members = await forTenant(db(), s.actor.tenantId).membership.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          twoFactorEnabledAt: true,
          lastLoginAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return (
    <>
      <h1>Kullanıcılar</h1>
      <table className="tbl" style={{ marginBottom: 18 }}>
        <thead>
          <tr>
            <th>Ad</th>
            <th>Rol</th>
            <th>Durum</th>
            <th>Son giriş</th>
            {manage && <th />}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>
                {m.user.name}
                <div className="muted" style={{ fontSize: 12 }}>
                  {m.user.email}
                </div>
              </td>
              <td>{m.role === "CLIENT_OWNER" ? "Firma sahibi" : "Kullanıcı"}</td>
              <td>
                {!m.user.passwordHash ? (
                  <span className="tag warn">Davet bekliyor</span>
                ) : (
                  <span className="tag ok">Aktif</span>
                )}{" "}
                {m.user.twoFactorEnabledAt && <span className="tag">2FA</span>}
              </td>
              <td>{fmtDate(m.user.lastLoginAt, true)}</td>
              {manage && (
                <td>
                  {m.role !== "CLIENT_OWNER" && (
                    <form action={removeMemberAction}>
                      <input type="hidden" name="userId" value={m.user.id} />
                      <Submit className="btn btn-o btn-sm" pendingText="…">
                        Çıkar
                      </Submit>
                    </form>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {manage ? (
        <InviteForm />
      ) : (
        <p className="muted">Kullanıcı davet etmek için firma sahibi yetkisi gerekir.</p>
      )}
    </>
  );
}
