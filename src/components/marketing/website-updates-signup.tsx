"use client";
import { useId, useState, type FormEvent } from "react";
import styles from "./website-updates.module.css";
export function WebsiteUpdatesSignup() {
  const id = useId();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, fields = new FormData(form);
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/updates/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fields.get("email"), name: fields.get("name"), consent: fields.get("consent") === "yes", website: fields.get("website") }) });
      const result = await response.json(); setMessage(response.ok ? result.message : result.error || "Please try again later.");
      if (response.ok) form.reset();
    } catch { setMessage("We couldn't complete your signup. Please try again later."); } finally { setBusy(false); }
  }
  return <section className={styles.signup} aria-labelledby={`${id}-title`} id="product-updates">
    <h2 id={`${id}-title`}>Stay up to date with Sheetomatic</h2>
    <p>A monthly digest and occasional new-feature announcements. Subscribe by email—no sales calls or WhatsApp follow-ups from this signup.</p>
    <form onSubmit={submit}>
      <div className={styles.fields}><label>Name (optional)<input name="name" autoComplete="given-name" maxLength={80} /></label><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label><button type="submit" disabled={busy}>{busy ? "Submitting…" : "Subscribe to updates"}</button></div>
      <label className={styles.consent}><input type="checkbox" name="consent" value="yes" required /><span>I want Sheetomatic’s monthly digest and new-feature emails. I can unsubscribe at any time.</span></label>
      <label className={styles.trap} aria-hidden="true">Leave blank<input name="website" tabIndex={-1} autoComplete="off" /></label>
      <p>We’ll send a confirmation link before adding you to the active subscriber list. Your name, email and consent are stored separately from anonymous traffic; Resend delivers the confirmation email. Analytics consent is not required. <a href="/privacy">Privacy policy</a></p>
      <p role="status" aria-live="polite">{message}</p>
    </form>
  </section>;
}
