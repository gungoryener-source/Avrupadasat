"use client";
/** Saate göre selamlama (kullanıcının yerel saati). Sunucuda nötr "Merhaba" ile başlar. */
import { useSyncExternalStore } from "react";

const noop = () => () => {};
function byHour() {
  const h = new Date().getHours();
  return h < 5 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar";
}

export function Greeting({ name }: { name: string }) {
  const g = useSyncExternalStore(noop, byHour, () => "Merhaba");
  return (
    <>
      {g}, {name}
    </>
  );
}
