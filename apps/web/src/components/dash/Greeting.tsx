"use client";
/** Saate göre selamlama (kullanıcının yerel saati). Sunucuda nötr selamla başlar. */
import { useSyncExternalStore } from "react";

type Words = { morning: string; day: string; evening: string; night: string; neutral: string };
const noop = () => () => {};

export function Greeting({ name, w }: { name: string; w: Words }) {
  const g = useSyncExternalStore(
    noop,
    () => {
      const h = new Date().getHours();
      return h < 5 ? w.night : h < 12 ? w.morning : h < 18 ? w.day : w.evening;
    },
    () => w.neutral,
  );
  return (
    <>
      {g}, {name}
    </>
  );
}
