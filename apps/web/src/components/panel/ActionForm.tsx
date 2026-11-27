"use client";
import { createContext, useActionState, useContext, useEffect, useRef } from "react";

type State = { ok?: string; error?: string; fieldErrors?: Record<string, string> } | undefined;
type Action = (s: State, fd: FormData) => Promise<State>;

const Ctx = createContext<State>(undefined);

/**
 * Sunucu eylemli form: başarı/hata mesajı, alan hataları (FieldError) ve başarıda sıfırlama.
 * JS olmadan da çalışır (ilerleyici geliştirme).
 */
export function ActionForm({
  action,
  children,
  className = "form",
  resetOnOk = true,
  encType,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  resetOnOk?: boolean;
  encType?: "multipart/form-data";
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnOk) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <Ctx.Provider value={state}>
      <form ref={ref} action={formAction} className={className} encType={encType} noValidate>
        {state?.error && (
          <p className="alert-err" role="alert">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="alert-ok" role="status">
            {state.ok}
          </p>
        )}
        {children}
      </form>
    </Ctx.Provider>
  );
}

export function FieldError({ name }: { name: string }) {
  const s = useContext(Ctx);
  const e = s?.fieldErrors?.[name];
  return e ? <span className="err">{e}</span> : null;
}
