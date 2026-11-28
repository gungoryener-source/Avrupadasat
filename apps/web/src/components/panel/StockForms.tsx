/** Ekip stok formları: giriş/çıkış düzeltmesi, raf konumu, ürün görseli */
import { ActionForm, FieldError } from "@/components/panel/ActionForm";
import { Submit } from "@/components/Submit";
import {
  adjustStockAction,
  setLocationAction,
  staffProductImageAction,
} from "@/app/admin/portal-actions";

export function AdjustForm({ tenantId, sku }: { tenantId: string; sku: string }) {
  return (
    <ActionForm action={adjustStockAction}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="sku" value={sku} />
      <div className="form-row">
        <div className="field">
          <label htmlFor={`dir-${sku}`}>Yön</label>
          <select id={`dir-${sku}`} name="dir" defaultValue="in">
            <option value="in">Giriş (+)</option>
            <option value="out">Çıkış (−)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`qty-${sku}`}>Adet</label>
          <input id={`qty-${sku}`} name="qty" type="number" min={1} required />
          <FieldError name="delta" />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`note-${sku}`}>Neden</label>
        <input
          id={`note-${sku}`}
          name="note"
          required
          minLength={3}
          maxLength={200}
          placeholder="ör. sayım farkı, numune çıkışı"
        />
        <FieldError name="note" />
      </div>
      <div>
        <Submit className="btn btn-o btn-sm" pendingText="…">
          Stoğu güncelle
        </Submit>
      </div>
    </ActionForm>
  );
}

export function LocationForm({
  tenantId,
  sku,
  location,
}: {
  tenantId: string;
  sku: string;
  location: string | null;
}) {
  return (
    <ActionForm action={setLocationAction} className="form row-actions" resetOnOk={false}>
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="sku" value={sku} />
      <input
        name="location"
        defaultValue={location ?? ""}
        placeholder="A-03-2"
        maxLength={24}
        aria-label={`${sku} raf konumu`}
        style={{ width: 96 }}
      />
      <Submit className="btn btn-o btn-sm" pendingText="…">
        Kaydet
      </Submit>
    </ActionForm>
  );
}

export function StaffImageForm({ tenantId, sku }: { tenantId: string; sku: string }) {
  return (
    <ActionForm action={staffProductImageAction} encType="multipart/form-data">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="sku" value={sku} />
      <div className="field">
        <label htmlFor={`img-${sku}`}>Ürün görseli (PNG/JPG, ≤ 3 MB)</label>
        <input id={`img-${sku}`} name="image" type="file" accept="image/png,image/jpeg" required />
      </div>
      <div>
        <Submit className="btn btn-o btn-sm" pendingText="…">
          Görseli kaydet
        </Submit>
      </div>
    </ActionForm>
  );
}
