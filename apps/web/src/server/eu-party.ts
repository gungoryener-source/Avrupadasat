/**
 * AB sorumlu taraf kaydı ve mal kabul kapısı (Kapı 0 K0-1).
 * Kapı: kayıt yoksa mal kabul bildirimi (ASN) oluşturulamaz. Böylece AB'de sorumlu aktörü olmayan ürün
 * depoya girmez (aksi hâlde Yön. 2019/1020 Md. 4(2)(d) gereği sorumluluk fulfillment sağlayıcısına geçer).
 * Kapı EU_PARTY_GATE=0 ile kapatılabilir (yalnız avukat görüşüyle).
 */
import { euPartyInput, type EuPartyInput } from "@avrupadasat/core/eu-party";
import { forTenant } from "@avrupadasat/db";
import { audit } from "./audit";
import { db } from "./db";

export const EU_PARTY_REQUIRED =
  "Mal kabul bildirimi için önce Şirket sayfasında AB sorumlu taraf bilgilerini tamamlayın";

export const euPartyGateEnabled = () => process.env.EU_PARTY_GATE !== "0";

export function getEuParty(tenantId: string) {
  return forTenant(db(), tenantId).euResponsibleParty.findFirst();
}

export async function assertEuPartyForInbound(tenantId: string) {
  if (!euPartyGateEnabled()) return;
  if (!(await getEuParty(tenantId))) throw new Error(EU_PARTY_REQUIRED);
}

export async function saveEuParty(tenantId: string, input: EuPartyInput, actorUserId: string) {
  const data = euPartyInput.parse(input);
  const t = forTenant(db(), tenantId);
  const existing = await t.euResponsibleParty.findFirst({ select: { id: true } });
  const row = existing
    ? await t.euResponsibleParty.update({
        where: { id: existing.id },
        data: { ...data, updatedById: actorUserId },
      })
    : await t.euResponsibleParty.create({
        data: { ...data, tenantId, updatedById: actorUserId },
      });
  await audit({
    actorUserId,
    tenantId,
    action: "tenant.updated",
    entity: "EuResponsibleParty",
    entityId: row.id,
    meta: { importerModel: data.importerModel, created: !existing },
  });
  return row;
}
