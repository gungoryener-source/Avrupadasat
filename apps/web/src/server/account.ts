/**
 * Kullanıcının kendi hesabını silmesi (App Store 5.1.1(v) ve Google Play hesap silme şartı; DSGVO Md. 17).
 *
 * - Parola (ve 2FA açıksa TOTP) ile yeniden doğrulama zorunlu.
 * - Kişisel veriler anonimleştirilir (e-posta, ad, parola, 2FA sırrı); oturumlar, mobil anahtarlar
 *   (anlık bildirim dahil) ve bekleyen davet/sıfırlama bağlantıları silinir, üyelikler kaldırılır.
 * - Kullanıcı satırı silinmez: audit kayıtları (kim, ne zaman) kimliğe bağlı kalır ama artık kişiye
 *   götüren veri içermez.
 * - Firma verisi (faturalar, belgeler, siparişler) kullanıcıya değil firmaya aittir ve yasal saklama
 *   yükümlülüğü olabilir; son firma sahibi ayrılırsa ekip bilgilendirilir, karar ekipte.
 *   TODO(verify): Saklama süreleri ve anonimleştirme kapsamı avukatla doğrulanmalı.
 */
import { audit } from "./audit";
import { consumeTotp } from "./auth";
import { db } from "./db";
import { emit } from "./outbox";
import { verifyPassword } from "./password";
import { hit } from "./rate-limit";

export type DeleteAccountResult =
  { ok: true; ownerlessTenants: string[] } | { ok: false; reason: string };

export const DELETE_ERRORS = {
  rate: "Çok fazla deneme. Bir saat sonra tekrar deneyin.",
  creds: "Parola veya doğrulama kodu hatalı.",
  staff: "Ekip hesapları yönetici tarafından kapatılır.",
  confirm: "Silme işlemini onaylamanız gerekiyor.",
} as const;

export const deletedEmail = (userId: string) => `silindi-${userId}@deleted.invalid`;

export async function deleteOwnAccount(
  userId: string,
  input: { password: string; code?: string; confirm: boolean },
  ip: string | null,
): Promise<DeleteAccountResult> {
  if (!input.confirm) return { ok: false, reason: DELETE_ERRORS.confirm };
  if (!(await hit(`account-delete:${userId}`, 5, 3600)))
    return { ok: false, reason: DELETE_ERRORS.rate };
  const user = await db().user.findUnique({ where: { id: userId } });
  if (!user || user.disabledAt) return { ok: false, reason: DELETE_ERRORS.creds };
  if (user.staffRole) return { ok: false, reason: DELETE_ERRORS.staff };
  if (!(await verifyPassword(user.passwordHash, input.password))) {
    return { ok: false, reason: DELETE_ERRORS.creds };
  }
  if (user.twoFactorEnabledAt && user.twoFactorSecretEnc) {
    const ok = await consumeTotp(
      user.id,
      user.twoFactorSecretEnc,
      input.code ?? "",
      user.lastTotpStep,
    );
    if (!ok) return { ok: false, reason: DELETE_ERRORS.creds };
  }

  const memberships = await db().membership.findMany({ where: { userId } });
  const ownerless: string[] = [];
  for (const m of memberships.filter((x) => x.role === "CLIENT_OWNER")) {
    const others = await db().membership.count({
      where: {
        tenantId: m.tenantId,
        role: "CLIENT_OWNER",
        userId: { not: userId },
        user: { disabledAt: null },
      },
    });
    if (others === 0) ownerless.push(m.tenantId);
  }

  await db().$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId } });
    await tx.apiToken.deleteMany({ where: { userId } });
    await tx.authToken.deleteMany({ where: { userId } });
    await tx.membership.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        email: deletedEmail(userId),
        name: "Silinmiş kullanıcı",
        passwordHash: null,
        twoFactorSecretEnc: null,
        twoFactorEnabledAt: null,
        lastTotpStep: null,
        lastLoginAt: null,
        failedLogins: 0,
        lockedUntil: null,
        disabledAt: new Date(),
      },
    });
    for (const tenantId of ownerless) {
      await emit(
        tx,
        "account.deletion_requested.v1",
        { reason: "last_owner_deleted" },
        { tenantId, idempotencyKey: `account.deletion_requested.v1:${tenantId}:${userId}` },
      );
    }
  });
  for (const m of memberships) {
    await audit({
      actorUserId: userId,
      tenantId: m.tenantId,
      action: "user.deleted",
      entity: "User",
      entityId: userId,
      ip,
    });
  }
  if (memberships.length === 0) {
    await audit({
      actorUserId: userId,
      action: "user.deleted",
      entity: "User",
      entityId: userId,
      ip,
    });
  }
  return { ok: true, ownerlessTenants: ownerless };
}
