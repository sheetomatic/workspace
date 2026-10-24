"use client";

import { useState, type CSSProperties } from "react";
import { defaultBanners, type MarketingBanner } from "@/lib/marketing-banners";
import styles from "./festive-offers.module.css";

export function FestiveOffers({ offers = defaultBanners }: { offers?: MarketingBanner[] }) {
  const [paused, setPaused] = useState(false);
  if (!offers.length) return null;
  const duration = Math.max(24, offers.reduce((length, offer) => length + offer.label.length + offer.description.length, 0) * 0.14);
  return (
    <section className={styles.banner} aria-label="Festive offers" data-paused={paused}
      style={{ "--ticker-duration": `${duration}s` } as CSSProperties}>
      <div className={styles.bar}>
        <span className={styles.badge}><span aria-hidden="true">✦</span> OFFERS</span>
        {/* The native details below is the accessible, stationary version of every offer. */}
        <div className={styles.viewport} aria-hidden="true">
          <div className={styles.track}>
            {[0, 1].map(copy => <div className={styles.group} key={copy}>
              {offers.map((offer, index) => <span className={styles.item} key={index}>
                <strong>{offer.label}</strong><span>{offer.description}</span><span className={styles.star}>✦</span>
              </span>)}
            </div>)}
          </div>
        </div>
        <button className={styles.pause} type="button" aria-label={paused ? "Resume offer scrolling" : "Pause offer scrolling"}
          aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Play" : "Pause"}</button>
      </div>
      <details className={styles.details}>
        <summary>View all {offers.length} offers &amp; links <span aria-hidden="true">↗</span></summary>
        <div className={styles.cards}>
          {offers.map((offer, index) => <article className={styles.card} key={index}>
            <p className={styles.label}>{offer.label}</p>
            <h2>{offer.title}</h2>
            <p className={styles.description}>{offer.description}</p>
            <a className={styles.cta} href={offer.href}
              target={offer.href.startsWith("https://") ? "_blank" : undefined}
              rel={offer.href.startsWith("https://") ? "noopener noreferrer sponsored" : undefined}>
              {offer.action} <span aria-hidden="true">↗</span>
              {offer.href.startsWith("https://") && <span className={styles.srOnly}> (opens in a new tab)</span>}
            </a>
            <p className={styles.note}>{offer.note}</p>
          </article>)}
        </div>
      </details>
    </section>
  );
}
