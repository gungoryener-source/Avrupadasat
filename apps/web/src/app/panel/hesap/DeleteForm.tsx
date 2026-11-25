"use client";
import { useActionState } from "react";
import { Submit } from "@/components/Submit";
import { deleteAccountAction } from "./actions";

export function DeleteAccountForm({ needsCode }: { needsCode: boolean }) {
  const [state, action] = useActionState(deleteAccountAction, undefined);
  return (
    <form action={action} className="card form" autoComplete="off">
      {state?.error && (
        <p className="alert-err" role="alert">
          {state.error}
        </p>
      )}
      <label>
        Parola
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      {needsCode && (
        <label>
          Doğrulama kodu (kimlik doğrulayıcı uygulamadan)
          <input
            name="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
          />
        </label>
      )}
      <label className="check">
        <input name="confirm" type="checkbox" required />
        <span>
          Hesabımın kalıcı olarak silineceğini ve bu işlemin geri alınamayacağını anladım.
        </span>
      </label>
      <Submit className="btn" pendingText="Siliniyor…">
        Hesabımı sil
      </Submit>
    </form>
  );
}
