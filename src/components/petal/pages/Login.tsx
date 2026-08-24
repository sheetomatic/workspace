"use client";

import { useState, type FormEvent } from "react";
import { BrandLogo } from "../BrandLogo";
import { PetalLink, usePetalNav } from "../nav";
import { tryLogin } from "../session";
import { useAgency } from "../ui";

const SEATS = [
  { id: "owner", label: "Owner", phone: "9876543210", pin: "1234" },
  { id: "driver", label: "Driver", phone: "9123456780", pin: "0000" },
  { id: "party", label: "Party", phone: "8982199027", pin: "1111" },
] as const;

export function StoreLogin() {
  return <Gate start="owner" />;
}

export function PartyLogin() {
  return <Gate start="party" />;
}

function Gate({ start }: { start: "owner" | "party" }) {
  const a = useAgency();
  const nav = usePetalNav();
  const first = SEATS.find((s) => s.id === start) ?? SEATS[0];
  const [seat, setSeat] = useState<(typeof SEATS)[number]>(first);
  const [phone, setPhone] = useState<string>(first.phone);
  const [pin, setPin] = useState<string>(first.pin);
  const [err, setErr] = useState("");

  function pick(s: (typeof SEATS)[number]) {
    setSeat(s);
    setPhone(s.phone);
    setPin(s.pin);
    setErr("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const s = tryLogin(phone, pin);
    if (!s) {
      setErr("Mobile or PIN does not match this store.");
      return;
    }
    if (s.role === "staff") nav("/staff");
    else if (s.role === "customer") nav(`/c/${s.id}`);
    else nav("/app");
  }

  return (
    <div className="pp-shell">
      <div className="pp-phone">
        <header className="pp-bar">
          <BrandLogo size={32} />
          <h1>{a.name}</h1>
        </header>
        <div style={{ background: "#071018", color: "var(--ink)", padding: "28px 20px 36px", textAlign: "center", borderBottom: "1px solid #1a2433" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <BrandLogo size={88} wide />
          </div>
          <div style={{ fontSize: 22, fontWeight: 500 }}>{a.store}</div>
          <div style={{ opacity: 0.85, fontSize: 13, marginTop: 4 }}>{a.address}</div>
          <div style={{ opacity: 0.85, fontSize: 13, marginTop: 4 }}>Contact {a.phone} · 1 store · {a.staff.length}/5 users</div>
        </div>
        <form onSubmit={onSubmit} style={{ padding: 16, marginTop: -16, background: "var(--bone)", flex: 1 }}>
          <div className="pp-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {SEATS.map((s) => (
                <button key={s.id} type="button" onClick={() => pick(s)} style={{
                  flex: 1, border: 0, borderBottom: seat.id === s.id ? "3px solid var(--pp)" : "3px solid transparent",
                  background: "transparent", padding: "8px 4px", fontWeight: 500, color: seat.id === s.id ? "var(--pp-dark)" : "var(--muted)",
                }}>{s.label}</button>
              ))}
            </div>
            <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
              Mobile
              <input className="pp-field" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" />
            </label>
            <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
              PIN
              <input className="pp-field" value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" />
            </label>
            {err ? <div style={{ color: "var(--bad)", fontWeight: 500, marginBottom: 10 }}>{err}</div> : null}
            <button type="submit" className="pp-btn">Login</button>
          </div>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
            {start === "owner"
              ? <PetalLink to="/customer-login">Party bill →</PetalLink>
              : <PetalLink to="/">← Store login</PetalLink>}
          </p>
        </form>
      </div>
    </div>
  );
}
