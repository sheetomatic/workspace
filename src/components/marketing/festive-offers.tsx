"use client";

import { useEffect, useState } from "react";
import styles from "./festive-offers.module.css";

import { defaultBanners, type MarketingBanner } from "@/lib/marketing-banners";

export function FestiveOffers({offers = defaultBanners}: {offers?: MarketingBanner[]}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (paused || hovered || motion.matches || offers.length < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((current) => (current + 1) % offers.length);
    }, 8000);
    const stop = () => { if (motion.matches) window.clearInterval(timer); };
    motion.addEventListener("change", stop);
    return () => { window.clearInterval(timer); motion.removeEventListener("change", stop); };
  }, [paused, hovered, offers.length]);

  if (!offers.length) return null;

  return (
    <section className={styles.banner} aria-label="Festive offers" aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setPaused(true)}>
      <div className={styles.decoration} aria-hidden="true">✦</div>
      <div className={styles.slides} aria-live={paused ? "polite" : "off"}>
        {offers.map((offer, index) => (
          <div key={index} hidden={index !== active % offers.length} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${offers.length}`}>
            <p className={styles.label}>{offer.label}</p>
            <h2>{offer.title}</h2>
            <p className={styles.description}>{offer.description}</p>
            <a className={styles.cta} href={offer.href}
              target={offer.href.startsWith("https://") ? "_blank" : undefined}
              rel={offer.href.startsWith("https://") ? "noopener noreferrer sponsored" : undefined}>
              {offer.action} <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
              {offer.href.startsWith("https://") && <span className={styles.srOnly}> (opens in a new tab)</span>}
            </a>
            <p className={styles.note}>{offer.note}</p>
          </div>
        ))}
      </div>
      <div className={styles.controls} aria-label="Offer controls">
        {offers.map((offer, index) => (
          <button key={index} type="button" aria-label={`Show ${offer.label}`} aria-pressed={index === active % offers.length}
            onClick={() => { setActive(index); setPaused(true); }}>{String(index + 1).padStart(2, "0")}</button>
        ))}
        <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Resume offer rotation" : "Pause offer rotation"}>
          {paused ? "Play" : "Pause"}
        </button>
      </div>
    </section>
  );
}
