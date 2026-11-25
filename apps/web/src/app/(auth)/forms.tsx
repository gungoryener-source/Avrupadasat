"use client";
import { useActionState } from "react";
import { Submit } from "@/components/Submit";
import {
  confirmTwoFactorAction,
  forgotAction,
  loginAction,
  setPasswordAction,
  startTwoFactorAction,
  twoFactorAction,
  type FormState,
} from "./actions";

function Alert({ state }: { state: FormState }) {
  if (state?.error)
    return (
      <p className="alert-err" role="alert">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p className="alert-ok" role="status">
        {state.ok}
      </p>
    );
  return null;
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="form">
      <Alert state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="field">
        <label htmlFor="email">E-posta</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">Şifre</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <Submit pendingText="Giriş yapılıyor…">Giriş yap</Submit>
    </form>
  );
}

export function TwoFactorForm() {
  const [state, action] = useActionState(twoFactorAction, undefined);
  return (
    <form action={action} className="form">
      <Alert state={state} />
      <div className="field">
        <label htmlFor="code">Doğrulama kodu</label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
        />
      </div>
      <Submit pendingText="Doğrulanıyor…">Doğrula</Submit>
    </form>
  );
}

export function TwoFactorSetup() {
  const [setup, start] = useActionState(startTwoFactorAction, undefined);
  const [state, confirm] = useActionState(confirmTwoFactorAction, undefined);
  if (!setup?.qr) {
    return (
      <form action={start} className="form">
        <p className="muted">
          Google Authenticator, Microsoft Authenticator veya benzeri bir uygulama gerekir.
        </p>
        <Submit pendingText="Hazırlanıyor…">Kuruluma başla</Submit>
      </form>
    );
  }
  return (
    <form action={confirm} className="form">
      <Alert state={state} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={setup.qr}
        alt="2FA QR kodu"
        width={220}
        height={220}
        style={{ border: "1px solid var(--line)", borderRadius: 12 }}
      />
      <p className="muted" style={{ fontSize: 13 }}>
        QR okutamıyorsanız anahtarı elle girin: <span className="mono">{setup.secret}</span>
      </p>
      <div className="field">
        <label htmlFor="code">Uygulamadaki 6 haneli kod</label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          required
        />
      </div>
      <Submit pendingText="Doğrulanıyor…">2FA&apos;yı etkinleştir</Submit>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotAction, undefined);
  return (
    <form action={action} className="form">
      <Alert state={state} />
      <div className="field">
        <label htmlFor="email">E-posta</label>
        <input id="email" name="email" type="email" required />
      </div>
      <Submit>Bağlantı gönder</Submit>
    </form>
  );
}

export function SetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(setPasswordAction, undefined);
  return (
    <form action={action} className="form">
      <Alert state={state} />
      <input type="hidden" name="token" value={token} />
      <div className="field">
        <label htmlFor="password">Yeni şifre</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
        <small className="muted">En az 12 karakter; harf ve rakam içermeli.</small>
      </div>
      <div className="field">
        <label htmlFor="password2">Yeni şifre (tekrar)</label>
        <input
          id="password2"
          name="password2"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <Submit>Şifreyi kaydet</Submit>
    </form>
  );
}
