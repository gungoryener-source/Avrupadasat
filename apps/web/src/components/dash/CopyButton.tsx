"use client";
import { useState } from "react";
import { IconCheck, IconCopy } from "@/components/site/Icons";

/** Panoya kopyalar; ekran okuyucuya sonucu duyurur */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      title={label}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {
          setOk(false);
        }
      }}
    >
      {ok ? <IconCheck size={14} /> : <IconCopy size={14} />}
      <span className="sr-only" aria-live="polite">
        {ok ? "Kopyalandı" : ""}
      </span>
    </button>
  );
}
