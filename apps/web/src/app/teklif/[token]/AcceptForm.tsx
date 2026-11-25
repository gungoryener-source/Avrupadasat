"use client";
import { useActionState } from "react";
import { Submit } from "@/components/Submit";
import { acceptQuoteAction } from "./actions";

export function AcceptForm({ token }: { token: string }) {
  const [state, action] = useActionState(acceptQuoteAction, undefined);
  if (state?.ok) {
    return (
      <p className="alert-ok" role="status">
        Teşekkürler! Teklif onaylandı. Müşteri paneli davetiniz birkaç dakika içinde e-postanıza
        gelecek.
      </p>
    );
  }
  return (
    <form
      action={action}
      className="form"
      style={{ borderTop: "1px solid var(--line)", paddingTop: 18 }}
    >
      <h2 style={{ margin: 0, fontSize: 20 }}>Çevrimiçi onay</h2>
      {state?.error && <p className="alert-err">{state.error}</p>}
      <input type="hidden" name="token" value={token} />
      <div className="field">
        <label htmlFor="name">Firma adına onaylayan (ad soyad)</label>
        <input id="name" name="name" autoComplete="name" required minLength={3} maxLength={120} />
      </div>
      <label className="check">
        <input type="checkbox" name="terms" required />
        <span>
          Firma adına yetkili olduğumu, teklifi ve{" "}
          <a href="/hizmet-sartlari" target="_blank">
            hizmet şartlarını
          </a>{" "}
          kabul ettiğimi onaylıyorum. Onay zamanı ve IP adresi sözleşme kaydı olarak saklanır.
        </span>
      </label>
      <Submit pendingText="Onaylanıyor…">Teklifi onayla</Submit>
    </form>
  );
}
