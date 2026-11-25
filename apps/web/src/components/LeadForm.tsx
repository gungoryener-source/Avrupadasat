"use client";
import { useActionState, useEffect, useState } from "react";
import { productCategories } from "@avrupadasat/core/events";
import { submitLeadAction } from "@/app/(site)/lead-action";
import { track } from "@/components/consent";
import { Submit } from "./Submit";

const CATEGORY_LABEL: Record<(typeof productCategories)[number], string> = {
  tekstil: "Tekstil ve ev tekstili",
  mobilya: "Mobilya",
  gida: "Gıda",
  kozmetik: "Kozmetik ve kişisel bakım",
  "ev-mutfak": "Ev ve mutfak",
  elektronik: "Elektronik",
  diger: "Diğer",
};

const ATTR_STORAGE = "as_attr";

/** Reklam tıklama bilgisi (gclid, UTM) ilk girişte saklanır, formla gönderilir */
function useAttribution() {
  const [attr, setAttr] = useState<Record<string, string>>({});
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const fromUrl: Record<string, string> = {};
    const map: Record<string, string> = {
      utm_source: "utmSource",
      utm_medium: "utmMedium",
      utm_campaign: "utmCampaign",
      gclid: "gclid",
      fbclid: "fbclid",
    };
    for (const [q, k] of Object.entries(map)) {
      const v = p.get(q);
      if (v) fromUrl[k] = v;
    }
    let stored: Record<string, string> = {};
    try {
      stored = JSON.parse(sessionStorage.getItem(ATTR_STORAGE) ?? "{}");
      if (Object.keys(fromUrl).length) {
        stored = { ...fromUrl, landingPath: window.location.pathname };
        sessionStorage.setItem(ATTR_STORAGE, JSON.stringify(stored));
      }
    } catch {
      stored = fromUrl;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tarayıcıya özgü bilgiyi bir kez okur
    setAttr(stored);
  }, []);
  return attr;
}

export function LeadForm({
  id = "rapor-formu",
  turnstileSiteKey,
}: {
  id?: string;
  turnstileSiteKey?: string;
}) {
  const [state, action] = useActionState(submitLeadAction, undefined);
  const attr = useAttribution();
  const fe = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  useEffect(() => {
    if (state?.ok) track("generate_lead", { form: "uygunluk_raporu" });
  }, [state]);

  if (state?.ok) {
    return (
      <div className="alert-ok" role="status" style={{ padding: 20 }}>
        <b>Talebiniz alındı.</b> Uygunluk raporunuz 48 saat içinde e-postanıza gönderilecek. Sorunuz
        olursa bu e-postayı yanıtlayabilirsiniz.
      </div>
    );
  }
  return (
    <form action={action} className="form" id={id} noValidate>
      {state && !state.ok && state.error && <p className="alert-err">{state.error}</p>}
      {Object.entries(attr).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div aria-hidden style={{ position: "absolute", left: "-9999px" }}>
        <label>
          Web sitesi <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="field">
        <label htmlFor={`${id}-company`}>Firma adı</label>
        <input
          id={`${id}-company`}
          name="companyName"
          autoComplete="organization"
          required
          aria-invalid={!!fe.companyName}
        />
        {fe.companyName && <span className="err">{fe.companyName}</span>}
      </div>
      <div className="field">
        <label htmlFor={`${id}-email`}>E-posta</label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={!!fe.email}
        />
        {fe.email && <span className="err">{fe.email}</span>}
      </div>
      <div className="field">
        <label htmlFor={`${id}-phone`}>Telefon (WhatsApp)</label>
        <input
          id={`${id}-phone`}
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          aria-invalid={!!fe.phone}
        />
        {fe.phone && <span className="err">{fe.phone}</span>}
      </div>
      <div className="field">
        <label htmlFor={`${id}-cat`}>Ürün kategorisi</label>
        <select
          id={`${id}-cat`}
          name="category"
          required
          defaultValue=""
          aria-invalid={!!fe.category}
        >
          <option value="" disabled>
            Seçin
          </option>
          {productCategories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        {fe.category && <span className="err">{fe.category}</span>}
      </div>
      <label className="check">
        <input type="checkbox" name="consentKvkk" required />
        <span>
          <a href="/kvkk" target="_blank">
            KVKK aydınlatma metnini
          </a>{" "}
          okudum; verilerimin talebimi yanıtlamak için işlenmesini kabul ediyorum.
        </span>
      </label>
      {fe.consentKvkk && <span className="err">{fe.consentKvkk}</span>}
      <label className="check">
        <input type="checkbox" name="marketingConsent" />
        <span>
          Avrupa&apos;ya ihracat rehberleri ve duyurular e-postayla gönderilebilir (isteğe bağlı).
        </span>
      </label>
      {turnstileSiteKey && <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />}
      <Submit pendingText="Gönderiliyor…">Ücretsiz raporumu iste</Submit>
    </form>
  );
}
