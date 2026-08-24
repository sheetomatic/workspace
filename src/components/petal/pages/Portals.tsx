"use client";

import { useParams } from "next/navigation";
import { PetalLink, usePetalNav } from "../nav";
import {
  collectPayment,
  customer,
  markDelivery,
  money,
  pauseCustomer,
  product,
  todayStats,
} from "../data";
import { BrandLogo } from "../BrandLogo";
import { writeSession } from "../session";
import { Pill, useAgency } from "../ui";

export function StaffApp() {
  const a = useAgency();
  const nav = usePetalNav();
  const s = todayStats();
  const mine = a.deliveries.filter((d) => d.driverId === "s1");
  const left = mine.filter((d) => d.status !== "Delivered" && d.status !== "Skipped");

  return (
    <div className="pp-shell">
      <div className="pp-phone">
        <header className="pp-bar">
          <button type="button" aria-label="Back" style={{ fontSize: 22, lineHeight: 1, width: 36 }} onClick={() => nav("/app")}>‹</button>
          <BrandLogo size={28} />
          <h1>Delivery</h1>
          <button type="button" onClick={() => { writeSession(null); nav("/"); }}>Out</button>
        </header>
        <div className="pp-body">
          <div className="pp-banner">
            <div style={{ fontSize: 13 }}>Namaste, Ramesh</div>
            <div>{left.length} left · collect {money(s.collect)}</div>
          </div>
          {mine.map((d) => {
            const c = customer(d.customerId);
            return (
              <article key={d.id} className="pp-card" style={{ padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div><b>{c?.name}</b><div style={{ fontSize: 13, color: "var(--muted)" }}>{c?.area} · {d.no}</div></div>
                  <Pill on={d.status === "Delivered"}>{d.status}</Pill>
                </div>
                <div style={{ margin: "8px 0", fontSize: 13 }}>
                  {d.lines.map((l) => `${product(l.productId)?.name} ${l.filled} delivered / ${l.emptyBack} received`).join(" · ")}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="pp-btn" style={{ flex: 1 }} onClick={() => markDelivery(d.id, "Delivered")}>Deliver</button>
                  <button type="button" className="pp-btn-out" style={{ flex: 1 }} onClick={() => c && collectPayment(c.id, d.amount, "Cash")}>Collect {money(d.amount)}</button>
                </div>
              </article>
            );
          })}
          <PetalLink to="/app" className="pp-btn-out" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>Owner dashboard</PetalLink>
        </div>
      </div>
    </div>
  );
}

export function CustomerApp() {
  const { id } = useParams();
  const a = useAgency();
  const c = customer(id || "");
  const hist = a.deliveries.filter((d) => d.customerId === c?.id);
  const inv = a.invoices.filter((i) => i.customerId === c?.id);

  if (!c) return <div style={{ padding: 40 }}>Party not found. <PetalLink to="/">Home</PetalLink></div>;

  return (
    <div className="pp-shell">
      <div className="pp-phone">
        <header className="pp-bar">
          <PetalLink to="/" aria-label="Back" style={{ color: "#fff", fontSize: 28, lineHeight: 1, width: 36, textDecoration: "none" }}>‹</PetalLink>
          <BrandLogo size={28} />
          <h1>{a.name}</h1>
          <PetalLink to="/" style={{ color: "#fff" }}>Out</PetalLink>
        </header>
        <div className="pp-body">
          <div className="pp-banner">
            <div style={{ fontSize: 18, fontWeight: 500 }}>{c.name}</div>
            <div>{c.phone} · {c.area}</div>
            <div style={{ marginTop: 8 }}>Due {money(c.credit)} · jars with you {c.jarsOut}</div>
          </div>
          <div className="pp-card">
            <div className="pp-th">Bills</div>
            {inv.map((i) => (
              <PetalLink key={i.id} to={`/invoice/${i.id}`} className="pp-row" style={{ textDecoration: "none" }}>
                <span style={{ flex: 1 }}>{i.no} · {i.period}</span>
                <b>{money(i.amountToPay)}</b>
              </PetalLink>
            ))}
            {c.credit > 0 ? (
              <button type="button" className="pp-btn" style={{ margin: 12, width: "calc(100% - 24px)" }} onClick={() => collectPayment(c.id, c.credit, "UPI")}>Pay due {money(c.credit)} UPI</button>
            ) : <div style={{ padding: 12 }}><Pill on>No due</Pill></div>}
          </div>
          <div className="pp-card">
            <div className="pp-th">Jar history</div>
            {hist.map((d) => (
              <div key={d.id} className="pp-row">
                <span style={{ flex: 1 }}>{d.date} · {d.lines.reduce((n, l) => n + l.filled, 0)} jar · {d.status}</span>
                <b>{money(d.amount)}</b>
              </div>
            ))}
          </div>
          <button type="button" className="pp-btn-out" style={{ width: "100%" }} onClick={() => pauseCustomer(c.id, c.pausedUntil ? null : "30/08/2026")}>{c.pausedUntil ? "Resume" : "Pause"}</button>
        </div>
      </div>
    </div>
  );
}
