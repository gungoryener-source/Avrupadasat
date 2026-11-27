"use client";
/**
 * Ücretsiz uygunluk raporu — 5 adımlı form.
 * Tüm alanlar tek <form> içinde kalır (adımlar yalnız gizlenir); gönderim mevcut sunucu
 * eylemine (submitLeadAction) gider, ölçüm ve bot koruması tek adımlı formla aynıdır.
 */
import Link from "next/link";
import Script from "next/script";
import { useActionState, useEffect, useRef, useState } from "react";
import { productCategories } from "@avrupadasat/core/categories";
import {
  LEAD_CHANNEL_LABEL,
  LEAD_EXPORT_STATUS_LABEL,
  leadChannels,
  leadExportStatuses,
} from "@avrupadasat/core";
import { submitLeadAction } from "@/app/(site)/lead-action";
import { CATEGORY_LABEL, TURNSTILE_KEY, useAttribution, useLeadTracking } from "../LeadForm";
import { Submit } from "../Submit";
import { IconArrowRight, IconCheck, IconLock } from "./Icons";

const STEPS = [
  { key: "business", label: "İşletme" },
  { key: "product", label: "Ürün" },
  { key: "channel", label: "Pazar" },
  { key: "export", label: "İhracat" },
  { key: "contact", label: "İletişim" },
] as const;

/** Sunucu hatası hangi adımda düzeltilir */
const FIELD_STEP: Record<string, number> = {
  companyName: 0,
  category: 1,
  email: 4,
  phone: 4,
  consentKvkk: 4,
};

type Errors = Record<string, string>;

function validate(step: number, form: HTMLFormElement): Errors {
  const fd = new FormData(form);
  const v = (k: string) => String(fd.get(k) ?? "").trim();
  const e: Errors = {};
  if (step === 0 && v("companyName").length < 2) e.companyName = "Firma adını yazın";
  if (step === 1 && !v("category")) e.category = "Ürün kategorisi seçin";
  if (step === 2 && fd.getAll("channels").length === 0)
    e.channels = "En az bir seçenek işaretleyin";
  if (step === 3 && !v("exportStatus")) e.exportStatus = "Bir seçenek işaretleyin";
  if (step === 4) {
    if (v("contactName").length < 2) e.contactName = "Adınızı ve soyadınızı yazın";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) e.email = "Geçerli bir e-posta yazın";
    if (v("phone").replace(/\D/g, "").length < 7) e.phone = "Geçerli bir telefon yazın";
    if (fd.get("consentKvkk") !== "on") e.consentKvkk = "KVKK aydınlatma metnini onaylayın";
  }
  return e;
}

export function AssessmentForm({ id = "rapor-formu" }: { id?: string }) {
  const [state, action] = useActionState(submitLeadAction, undefined);
  const attr = useAttribution();
  const onSubmitCapture = useLeadTracking(state);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  // Sunucu hatası: ilgili adıma dön
  const serverErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    const keys = Object.keys(serverErrors);
    if (keys.length) {
      setErrors(serverErrors);
      setStep(Math.min(...keys.map((k) => FIELD_STEP[k] ?? 4)));
    }
  }

  // Adım değişince odağı yeni adımın başlığına taşı (klavye ve ekran okuyucu için)
  useEffect(() => {
    if (!moved.current) return;
    stepRef.current?.querySelector<HTMLElement>("[data-step-title]")?.focus();
  }, [step]);

  function next() {
    const form = formRef.current;
    if (!form) return;
    const e = validate(step, form);
    setErrors(e);
    if (Object.keys(e).length) {
      form.querySelector<HTMLElement>(`[data-step="${step}"] [aria-invalid="true"]`)?.focus();
      return;
    }
    moved.current = true;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    moved.current = true;
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  function onSubmit(ev: React.FormEvent<HTMLFormElement>) {
    // Ara adımlarda Enter tuşu formu göndermez, bir sonraki adıma geçer
    if (step < STEPS.length - 1) {
      ev.preventDefault();
      next();
      return;
    }
    const e = validate(4, ev.currentTarget);
    if (Object.keys(e).length) {
      ev.preventDefault();
      setErrors(e);
      return;
    }
    onSubmitCapture(ev);
  }

  if (state?.ok) {
    return (
      <div className="af-done" role="status">
        <span className="af-done__icon" aria-hidden>
          <IconCheck size={26} strokeWidth={2.2} />
        </span>
        <h3>Talebiniz alındı</h3>
        <p>
          Uygunluk raporunuz 48 saat içinde e-postanıza gönderilecek. Sorunuz olursa o e-postayı
          yanıtlamanız yeterli.
        </p>
        <ol className="af-done__next">
          <li>Ürününüz ve satış modeliniz için kayıt ve maliyet analizi yapılır.</li>
          <li>Rapor, size uygun şirket modeli ve aylık maliyet tahminiyle gönderilir.</li>
          <li>İsterseniz raporun ardından size özel teklif hazırlanır.</li>
        </ol>
        <Link href="/rehber" className="af-link">
          Bu arada Avrupa&apos;ya satış rehberlerine göz atın <IconArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const err = (k: string) =>
    errors[k] ? (
      <span className="err" id={`${id}-${k}-err`}>
        {errors[k]}
      </span>
    ) : null;
  const inv = (k: string) => ({
    "aria-invalid": !!errors[k],
    "aria-describedby": errors[k] ? `${id}-${k}-err` : undefined,
  });
  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <form
      ref={formRef}
      action={action}
      className="af"
      id={id}
      noValidate
      onSubmit={onSubmit}
      aria-label="Ücretsiz uygunluk raporu formu"
    >
      <input type="hidden" name="formVariant" value="assessment" />
      <input type="hidden" name="eventId" defaultValue="" />
      <input type="hidden" name="adsConsent" defaultValue="0" />
      <input type="hidden" name="sourceUrl" defaultValue="" />
      {Object.entries(attr).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div aria-hidden style={{ position: "absolute", left: "-9999px" }}>
        <label>
          Web sitesi <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="af-progress">
        <div className="af-progress__meta">
          <span>
            Adım {step + 1} / {STEPS.length}
          </span>
          <span>{STEPS[step]!.label}</span>
        </div>
        <div
          className="af-progress__bar"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label="Form ilerlemesi"
        >
          <span style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <ol className="af-progress__steps" aria-hidden>
          {STEPS.map((s, i) => (
            <li key={s.key} data-state={i < step ? "done" : i === step ? "now" : "todo"}>
              {s.label}
            </li>
          ))}
        </ol>
      </div>

      {state && !state.ok && state.error && <p className="alert-err">{state.error}</p>}

      <div ref={stepRef}>
        {/* 1 — İşletme */}
        <fieldset className="af-step" data-step={0} hidden={step !== 0}>
          <legend className="af-title" tabIndex={-1} data-step-title>
            İşletmenizi tanıyalım
          </legend>
          <div className="field">
            <label htmlFor={`${id}-company`}>Firma adı</label>
            <input
              id={`${id}-company`}
              name="companyName"
              autoComplete="organization"
              required
              {...inv("companyName")}
            />
            {err("companyName")}
          </div>
          <div className="af-row">
            <div className="field">
              <label htmlFor={`${id}-city`}>
                Şehir <span className="opt">isteğe bağlı</span>
              </label>
              <input id={`${id}-city`} name="city" autoComplete="address-level2" />
            </div>
            <div className="field">
              <label htmlFor={`${id}-site`}>
                Web sitesi <span className="opt">isteğe bağlı</span>
              </label>
              <input
                id={`${id}-site`}
                name="companyWebsite"
                type="url"
                inputMode="url"
                placeholder="ornek.com.tr"
                autoComplete="url"
              />
            </div>
          </div>
        </fieldset>

        {/* 2 — Ürün */}
        <fieldset
          className="af-step"
          data-step={1}
          hidden={step !== 1}
          aria-describedby={errors.category ? `${id}-category-err` : undefined}
        >
          <legend className="af-title" tabIndex={-1} data-step-title>
            Hangi ürünleri satmak istiyorsunuz?
          </legend>
          <div className="af-options af-options--grid">
            {productCategories.map((c, i) => (
              <label key={c} className="af-opt">
                <input
                  type="radio"
                  name="category"
                  value={c}
                  aria-invalid={i === 0 ? !!errors.category : undefined}
                />
                <span>{CATEGORY_LABEL[c]}</span>
              </label>
            ))}
          </div>
          {err("category")}
        </fieldset>

        {/* 3 — Pazar */}
        <fieldset
          className="af-step"
          data-step={2}
          hidden={step !== 2}
          aria-describedby={errors.channels ? `${id}-channels-err` : undefined}
        >
          <legend className="af-title" tabIndex={-1} data-step-title>
            Nerede satmayı düşünüyorsunuz?
          </legend>
          <p className="af-help">Birden fazla seçebilirsiniz.</p>
          <div className="af-options">
            {leadChannels.map((c, i) => (
              <label key={c} className="af-opt af-opt--check">
                <input
                  type="checkbox"
                  name="channels"
                  value={c}
                  aria-invalid={i === 0 ? !!errors.channels : undefined}
                />
                <span>{LEAD_CHANNEL_LABEL[c]}</span>
              </label>
            ))}
          </div>
          {err("channels")}
        </fieldset>

        {/* 4 — İhracat durumu */}
        <fieldset
          className="af-step"
          data-step={3}
          hidden={step !== 3}
          aria-describedby={errors.exportStatus ? `${id}-exportStatus-err` : undefined}
        >
          <legend className="af-title" tabIndex={-1} data-step-title>
            Bugün ihracat yapıyor musunuz?
          </legend>
          <div className="af-options">
            {leadExportStatuses.map((c, i) => (
              <label key={c} className="af-opt">
                <input
                  type="radio"
                  name="exportStatus"
                  value={c}
                  aria-invalid={i === 0 ? !!errors.exportStatus : undefined}
                />
                <span>{LEAD_EXPORT_STATUS_LABEL[c]}</span>
              </label>
            ))}
          </div>
          {err("exportStatus")}
        </fieldset>

        {/* 5 — İletişim */}
        <fieldset className="af-step" data-step={4} hidden={step !== 4}>
          <legend className="af-title" tabIndex={-1} data-step-title>
            Raporu kime gönderelim?
          </legend>
          <div className="field">
            <label htmlFor={`${id}-name`}>Ad soyad</label>
            <input
              id={`${id}-name`}
              name="contactName"
              autoComplete="name"
              {...inv("contactName")}
            />
            {err("contactName")}
          </div>
          <div className="af-row">
            <div className="field">
              <label htmlFor={`${id}-email`}>E-posta</label>
              <input
                id={`${id}-email`}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                {...inv("email")}
              />
              {err("email")}
            </div>
            <div className="field">
              <label htmlFor={`${id}-phone`}>Telefon (WhatsApp)</label>
              <input
                id={`${id}-phone`}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+90 5xx xxx xx xx"
                {...inv("phone")}
              />
              {err("phone")}
            </div>
          </div>
          <label className="check">
            <input type="checkbox" name="consentKvkk" {...inv("consentKvkk")} />
            <span>
              <a href="/kvkk" target="_blank" rel="noopener">
                KVKK aydınlatma metnini
              </a>{" "}
              okudum; verilerimin talebimi yanıtlamak için işlenmesini kabul ediyorum.
            </span>
          </label>
          {err("consentKvkk")}
          <label className="check">
            <input type="checkbox" name="marketingConsent" />
            <span>
              Avrupa&apos;ya ihracat rehberleri ve duyurular e-postayla gönderilebilir (isteğe
              bağlı).
            </span>
          </label>
          {TURNSTILE_KEY && (
            <>
              <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                strategy="afterInteractive"
              />
              <div className="cf-turnstile" data-sitekey={TURNSTILE_KEY} data-language="tr" />
            </>
          )}
        </fieldset>
      </div>

      <div className="af-nav">
        {step > 0 && (
          <button type="button" className="btn btn-o" onClick={back}>
            Geri
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn" onClick={next}>
            Devam
            <IconArrowRight size={18} />
          </button>
        ) : (
          <Submit pendingText="Gönderiliyor…">Ücretsiz raporumu iste</Submit>
        )}
      </div>

      <ul className="af-assure" aria-label="Koşullar">
        <li>Ücretsiz</li>
        <li>Taahhütsüz</li>
        <li>48 saat içinde rapor</li>
      </ul>
      <p className="af-privacy">
        <IconLock size={15} />
        <span>
          Bilgileriniz talebinizi yanıtlamak için işlenir. Ayrıntılar{" "}
          <a href="/kvkk" target="_blank" rel="noopener">
            KVKK aydınlatma metninde
          </a>
          .
        </span>
      </p>
    </form>
  );
}
