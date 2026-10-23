"use client";

import { useEffect, useState } from "react";
import styles from "./festive-offers.module.css";

const offers = [
  {
    label: "Sheetomatic · Diwali offer",
    title: "Light up your business. Not your setup bill.",
    description: "No setup cost. Pay only for the services.",
    action: "Discuss your requirements",
    href: "/contact?offer=diwali",
    note: "Tell us what you need and get your service quote.",
  },
  {
    label: "Discover AgentDaftar",
    title: "Explore AgentDaftar this festive season.",
    description: "Visit AgentDaftar through Sheetomatic’s referral link.",
    action: "Explore AgentDaftar",
    href: "https://app.agentdaftar.com/r/sheetomatic",
    note: "External referral link · AgentDaftar’s pricing and terms apply.",
  },
];

export function FestiveOffers() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (paused || hovered || motion.matches) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((current) => (current + 1) % offers.length);
    }, 8000);
    const stop = () => { if (motion.matches) window.clearInterval(timer); };
    motion.addEventListener("change", stop);
    return () => { window.clearInterval(timer); motion.removeEventListener("change", stop); };
  }, [paused, hovered]);

  return (
    <section className={styles.banner} aria-label="Festive offers" aria-roledescription="carousel"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setPaused(true)}>
      <div className={styles.decoration} aria-hidden="true">✦</div>
      <div className={styles.slides} aria-live={paused ? "polite" : "off"}>
        {offers.map((offer, index) => (
          <div key={offer.label} hidden={index !== active} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${offers.length}`}>
            <p className={styles.label}>{offer.label}</p>
            <h2>{offer.title}</h2>
            <p className={styles.description}>{offer.description}</p>
            <a className={styles.cta} href={offer.href}
              target={index === 1 ? "_blank" : undefined}
              rel={index === 1 ? "noopener noreferrer sponsored" : undefined}>
              {offer.action} <span aria-hidden="true">↗</span>
              {index === 1 && <span className={styles.srOnly}> (opens in a new tab)</span>}
            </a>
            <p className={styles.note}>{offer.note}</p>
          </div>
        ))}
      </div>
      <div className={styles.controls} aria-label="Offer controls">
        {offers.map((offer, index) => (
          <button key={offer.label} type="button" aria-label={`Show ${offer.label}`} aria-pressed={index === active}
            onClick={() => { setActive(index); setPaused(true); }}>{String(index + 1).padStart(2, "0")}</button>
        ))}
        <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Resume offer rotation" : "Pause offer rotation"}>
          {paused ? "Play" : "Pause"}
        </button>
      </div>
    </section>
  );
}
