"use client";
import { useActionState } from "react";
import { Submit } from "@/components/Submit";
import { sendQuoteAction } from "../../actions";

export function SendQuote({ id, label }: { id: string; label: string }) {
  const [state, action] = useActionState(sendQuoteAction, undefined);
  return (
    <form action={action} className="form">
      <input type="hidden" name="id" value={id} />
      {state?.error && <p className="alert-err">{state.error}</p>}
      {state?.link ? (
        <p className="alert-info">
          Teklif müşteriye e-postayla gönderildi. Bağlantı yalnız şimdi gösterilir:
          <br />
          <a href={state.link} target="_blank" rel="noreferrer">
            {state.link}
          </a>
        </p>
      ) : (
        <Submit pendingText="Gönderiliyor…">{label}</Submit>
      )}
    </form>
  );
}
