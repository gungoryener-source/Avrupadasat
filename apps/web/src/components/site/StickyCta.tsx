"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { IconArrowRight } from "./Icons";

/**
 * Mobilde alt kenara yapışık rapor düğmesi. Hero düğmesi veya form görünürken gizlenir,
 * böylece aynı çağrı ekranda iki kez görünmez. Masaüstünde CSS ile hiç gösterilmez.
 */
export function StickyCta() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.querySelector("[data-hero-cta]");
    const form = document.getElementById("rapor");
    if (!hero || !form || !("IntersectionObserver" in window)) return;
    const seen = new Map<Element, boolean>([
      [hero, true],
      [form, false],
    ]);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target, e.isIntersecting);
      setShow(!seen.get(hero) && !seen.get(form));
    });
    io.observe(hero);
    io.observe(form);
    return () => io.disconnect();
  }, []);
  return (
    <div className="sticky-cta2" data-show={show} aria-hidden={!show}>
      <div>
        <b>Ücretsiz uygunluk raporu</b>
        <span>48 saat içinde, taahhütsüz</span>
      </div>
      <Link href="#rapor" className="btn" tabIndex={show ? 0 : -1}>
        Rapor al
        <IconArrowRight size={16} />
      </Link>
    </div>
  );
}
