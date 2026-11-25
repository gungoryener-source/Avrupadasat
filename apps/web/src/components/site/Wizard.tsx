"use client";
import Link from "next/link";
import { useState } from "react";
import { evaluate, type WizardAnswers } from "@/content/wizard";
import { track } from "@/components/consent";

const CATS: [WizardAnswers["category"], string][] = [
  ["tekstil", "Tekstil ve ev tekstili"],
  ["mobilya", "Mobilya"],
  ["ev-mutfak", "Ev ve mutfak"],
  ["elektronik", "Elektronik"],
  ["kozmetik", "Kozmetik"],
  ["gida", "Gıda"],
  ["oyuncak", "Oyuncak"],
  ["diger", "Diğer"],
];

const LEVEL = {
  gerekli: ["Gerekli", "red"],
  muhtemel: ["Muhtemelen gerekli", "warn"],
  kontrol: ["Kontrol edilmeli", ""],
} as const;

export function Wizard() {
  const [a, setA] = useState<WizardAnswers>({
    category: "tekstil",
    electric: false,
    battery: false,
    foodContact: false,
    buyers: "B2C",
    stockInGermany: true,
  });
  const [done, setDone] = useState(false);
  const set = <K extends keyof WizardAnswers>(k: K, v: WizardAnswers[K]) => {
    setA((p) => ({ ...p, [k]: v }));
    setDone(false);
  };
  const yesNo = (k: "electric" | "battery" | "foodContact" | "stockInGermany", label: string) => (
    <fieldset className="field">
      <legend>{label}</legend>
      <div className="row">
        {[true, false].map((v) => (
          <label key={String(v)} className="check">
            <input type="radio" name={k} checked={a[k] === v} onChange={() => set(k, v)} />{" "}
            <span>{v ? "Evet" : "Hayır"}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
  const items = evaluate(a);
  return (
    <div className="g2">
      <form
        className="card form"
        onSubmit={(e) => {
          e.preventDefault();
          setDone(true);
          track("wizard_completed", { category: a.category });
        }}
      >
        <div className="field">
          <label htmlFor="w-cat">Ürün kategorisi</label>
          <select
            id="w-cat"
            value={a.category}
            onChange={(e) => set("category", e.target.value as WizardAnswers["category"])}
          >
            {CATS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {yesNo("electric", "Ürün elektrikle çalışıyor mu?")}
        {yesNo("battery", "Pil içeriyor veya pille mi satılıyor?")}
        {yesNo("foodContact", "Gıdayla temas ediyor mu (mutfak eşyası vb.)?")}
        <fieldset className="field">
          <legend>Kime satacaksınız?</legend>
          <div className="row">
            {(
              [
                ["B2C", "Tüketiciye"],
                ["B2B", "Yalnız firmalara"],
                ["both", "İkisine de"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="check">
                <input
                  type="radio"
                  name="buyers"
                  checked={a.buyers === v}
                  onChange={() => set("buyers", v)}
                />{" "}
                <span>{l}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {yesNo("stockInGermany", "Almanya'da stok tutacak mısınız?")}
        <button className="btn" type="submit">
          Kontrol listemi göster
        </button>
      </form>
      <div className="card" aria-live="polite">
        {!done ? (
          <p className="muted">
            Soruları yanıtlayın; ürününüz için olası kayıt ve belgeleri listeleyelim.
          </p>
        ) : (
          <>
            <h2 style={{ marginTop: 0, fontSize: 20 }}>
              Ön kontrol listeniz ({items.length} madde)
            </h2>
            <ul className="checklist">
              {items.map((i) => (
                <li key={i.id}>
                  <span className={`tag ${LEVEL[i.level][1]}`}>{LEVEL[i.level][0]}</span>{" "}
                  <b>{i.title}</b>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {i.why}
                  </div>
                </li>
              ))}
            </ul>
            <p className="note">
              Bu liste genel bir ön bilgilendirmedir. Kesin değerlendirme için ücretsiz uygunluk
              raporu isteyin.
            </p>
            <Link className="btn" href="/ucretsiz-uygunluk-raporu">
              Ücretsiz rapor iste
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
