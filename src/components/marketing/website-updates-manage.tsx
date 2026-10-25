"use client";
import { useState } from "react";
import Link from "next/link";
import styles from "./website-updates.module.css";
export function WebsiteUpdatesManage({ action, token }: { action: "confirm" | "unsubscribe"; token: string }) {
  const [busy, setBusy] = useState(false), [done, setDone] = useState(false), [message, setMessage] = useState("");
  async function save() {
    setBusy(true);
    try { const response = await fetch("/api/updates/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, token }) }); const result = await response.json();setMessage(response.ok ? result.message : result.error);setDone(response.ok); }
    catch { setMessage("We couldn't save your choice. Please try again."); } finally { setBusy(false); }
  }
  return <main className={styles.manage}><h1>{action === "confirm" ? "Confirm your email updates" : "Unsubscribe from email updates"}</h1><p>{action === "confirm" ? "Receive Sheetomatic’s monthly digest and occasional new-feature announcements. You can unsubscribe at any time." : "Stop Sheetomatic’s monthly digest and new-feature emails. This does not affect your account or transactional service messages."}</p><button onClick={save} disabled={busy || done}>{busy ? "Saving…" : done ? "Saved" : action === "confirm" ? "Confirm subscription" : "Unsubscribe"}</button><p role="status">{message}</p><Link href="/">Back to Sheetomatic</Link></main>;
}
