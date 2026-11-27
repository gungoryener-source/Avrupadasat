import { packages } from "@avrupadasat/core/pricing";
import { ActionForm } from "@/components/panel/ActionForm";
import { Submit } from "@/components/Submit";
import { changePackageAction } from "@/app/admin/portal-actions";

/** Paket kaydını değiştirir. Ödeme alınmaz; müşteriye bildirim gider, denetim kaydı tutulur. */
export function PackageForm({ tenantId, current }: { tenantId: string; current: string | null }) {
  return (
    <ActionForm action={changePackageAction} className="form row-actions" resetOnOk={false}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <select name="packageCode" defaultValue={current ?? ""} aria-label="Paket">
        <option value="">Paket yok</option>
        {Object.entries(packages).map(([k, p]) => (
          <option key={k} value={k}>
            {p.name}
          </option>
        ))}
      </select>
      <input name="note" placeholder="Not (ör. talep no)" maxLength={300} aria-label="Not" />
      <Submit className="btn btn-o btn-sm" pendingText="…">
        Kaydet
      </Submit>
    </ActionForm>
  );
}
