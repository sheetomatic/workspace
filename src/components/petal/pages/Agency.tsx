"use client";

import { useState } from "react";
import { PetalLink, usePetalNav } from "../nav";
import { APP, MAX_USERS, PRODUCT } from "../brand";
import {
  addCustomer,
  addDelivery,
  addExpense,
  addStaff,
  adjustStock,
  collectPayment,
  customer,
  EXPENSE_KINDS,
  generateInvoices,
  initials,
  markDelivery,
  money,
  setDeliveryLine,
  pauseCustomer,
  payExpense,
  reportCsv,
  resetDemo,
  setLang,
  todayStats,
  type ExpenseKind,
  type PayMode,
  type Shift,
  updateStore,
} from "../data";
import { BrandLogo } from "../BrandLogo";
import { writeSession } from "../session";
import { Pill, useAgency } from "../ui";

const NAV = [
  ["home", "Home"],
  ["deliveries", "Deliveries"],
  ["customers", "Customers"],
  ["invoices", "Invoices"],
  ["payments", "Payments"],
  ["expenses", "Expenses"],
  ["stock", "Stock"],
  ["staff", "Staff"],
  ["reports", "Reports"],
  ["settings", "Settings"],
  ["more", "More"],
] as const;

type Screen = (typeof NAV)[number][0];

const TABS: { id: Screen; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "deliveries", label: "Delivery" },
  { id: "customers", label: "Parties" },
  { id: "invoices", label: "Bills" },
  { id: "more", label: "More" },
];

const NESTED: Screen[] = ["payments", "expenses", "stock", "staff", "reports", "settings"];

export function AgencyApp() {
  const a = useAgency();
  const nav = usePetalNav();
  const [screen, setScreen] = useState<Screen>("home");
  const [shift, setShift] = useState<Shift>("morning");
  const [partyId, setPartyId] = useState<string | null>(null);
  const s = todayStats();
  const t = APP[a.lang];
  const moreOpen = !["home", "deliveries", "customers", "invoices"].includes(screen);
  const canBack = Boolean(partyId) || NESTED.includes(screen);
  const title = partyId ? (customer(partyId)?.name || t.customers) : t[screen];

  function go(next: Screen) {
    setPartyId(null);
    setScreen(next);
  }

  function goBack() {
    if (partyId) {
      setPartyId(null);
      return;
    }
    if (NESTED.includes(screen)) {
      setScreen("more");
      return;
    }
    setScreen("home");
  }

  return (
    <div className="pp-shell">
      <div className="pp-phone">
        <header className="pp-bar">
          <button type="button" onClick={canBack ? goBack : () => go("home")} aria-label={canBack ? "Back" : "Home"} style={{ fontSize: 22, lineHeight: 1, width: 36 }}>{canBack ? "‹" : "☰"}</button>
          <BrandLogo size={28} />
          <h1>{title}</h1>
          <button type="button" onClick={() => setLang(a.lang === "en" ? "hi" : "en")}>{a.lang === "en" ? "हिं" : "EN"}</button>
          <button type="button" onClick={() => { writeSession(null); nav("/"); }}>Out</button>
        </header>
        {screen === "deliveries" ? (
          <nav className="pp-tabs">
            {(["morning", "afternoon", "evening"] as const).map((x) => (
              <button key={x} type="button" className={shift === x ? "on" : ""} onClick={() => setShift(x)}>{x === "morning" ? "Morning" : x === "afternoon" ? "Afternoon" : "Evening"}</button>
            ))}
          </nav>
        ) : null}
        <div className="pp-body">
          {screen === "more" ? <MoreHub go={go} /> : null}
          {screen === "home" ? <Home s={s} go={go} /> : null}
          {screen === "deliveries" ? <Deliveries shift={shift} /> : null}
          {screen === "customers" ? <Customers partyId={partyId} setPartyId={setPartyId} /> : null}
          {screen === "invoices" ? <Invoices /> : null}
          {screen === "payments" ? <Payments /> : null}
          {screen === "expenses" ? <Expenses /> : null}
          {screen === "stock" ? <Stock /> : null}
          {screen === "staff" ? <Staff /> : null}
          {screen === "reports" ? <Reports s={s} /> : null}
          {screen === "settings" ? <Settings /> : null}
        </div>
        <nav className="pp-bottom">
          {TABS.map((x) => (
            <button key={x.id} type="button" className={(x.id === "more" ? moreOpen : screen === x.id) ? "on" : ""} onClick={() => go(x.id === "more" ? "more" : x.id)}>
              <div style={{ fontSize: 16, lineHeight: 1.2 }}>{x.id === "home" ? "⌂" : x.id === "deliveries" ? "💧" : x.id === "customers" ? "👤" : x.id === "invoices" ? "📄" : "☰"}</div>
              {x.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function MoreHub({ go }: { go: (x: Screen) => void }) {
  return (
    <div>
      <div className="pp-hint">One store · 5 users. Kharcha, stock, staff and reports live here.</div>
      <div className="pp-card">
        {NAV.filter(([id]) => !["home", "deliveries", "customers", "invoices", "more"].includes(id)).map(([id, label]) => (
          <button key={id} type="button" className="pp-row" style={{ width: "100%", border: 0, textAlign: "left" }} onClick={() => go(id)}>
            <span style={{ flex: 1, fontWeight: 500 }}>{label}</span>
            <span style={{ color: "#bdbdbd" }}>›</span>
          </button>
        ))}
      </div>
      <PetalLink to="/staff" className="pp-btn" style={{ textAlign: "center", textDecoration: "none", marginTop: 8 }}>Open driver phone</PetalLink>
    </div>
  );
}

function Step({ n, set }: { n: number; set: (x: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button type="button" className="pp-step" onClick={() => set(Math.max(0, n - 1))}>−</button>
      <span className="pp-qty">{n}</span>
      <button type="button" className="pp-step" onClick={() => set(n + 1)}>+</button>
    </div>
  );
}

function Home({ s, go }: { s: ReturnType<typeof todayStats>; go: (x: Screen) => void }) {
  const a = useAgency();
  const sales = a.deliveries.filter((d) => d.status === "Delivered").reduce((n, d) => n + d.amount, 0);
  const spent = a.expenses.reduce((n, e) => n + e.amount, 0);
  const delivered = a.deliveries.filter((d) => d.status === "Delivered").reduce((n, d) => n + d.lines.reduce((x, l) => x + l.filled, 0), 0);
  const received = a.deliveries.filter((d) => d.status === "Delivered").reduce((n, d) => n + d.lines.reduce((x, l) => x + l.emptyBack, 0), 0);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div className="pp-card" style={{ padding: 14, margin: 0 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Customers</div>
          <div style={{ fontSize: 26, fontWeight: 500, color: "var(--pp-dark)" }}>{a.customers.filter((c) => !c.discarded).length}</div>
        </div>
        <div className="pp-card" style={{ padding: 14, margin: 0 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Due</div>
          <div style={{ fontSize: 26, fontWeight: 500, color: "var(--bad)" }}>{money(s.due)}</div>
        </div>
      </div>
      <div className="pp-banner">
        <div style={{ fontSize: 13, opacity: 0.9 }}>Today’s Payment Received</div>
        <div style={{ fontSize: 28, fontWeight: 500 }}>{money(s.received)}</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>{s.done.length}/{s.total} delivered · {s.left.length} left</div>
      </div>
      <div className="pp-card">
        <div className="pp-th" style={{ gridTemplateColumns: "1.2fr .7fr .7fr 1fr" }}>
          <span>Product</span><span>Delivered</span><span>Received</span><span>Income</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr .7fr .7fr 1fr", padding: 10, fontSize: 13 }}>
          <span>Water Jar</span><span>{delivered}</span><span>{received}</span><span>{money(sales)}</span>
        </div>
      </div>
      <div className="pp-card">
        <div className="pp-th">Kharcha</div>
        {EXPENSE_KINDS.filter((k) => k.id !== "other").map((k) => (
          <button key={k.id} type="button" className="pp-row" style={{ width: "100%", border: 0, textAlign: "left" }} onClick={() => go("expenses")}>
            <span style={{ flex: 1 }}>{k.label}</span>
            <b>{money(a.expenses.filter((e) => e.kind === k.id).reduce((n, e) => n + e.amount, 0))}</b>
          </button>
        ))}
        <div className="pp-row"><span style={{ flex: 1 }}>Sales − expenses</span><b>{money(sales - spent)}</b></div>
      </div>
      <div className="pp-card">
        <div className="pp-th">Today’s route</div>
        {s.todayD.map((d) => {
          const c = customer(d.customerId);
          return (
            <div key={d.id} className="pp-row">
              <div className="pp-avatar">{initials(c?.name || "?")}</div>
              <div style={{ flex: 1 }}>
                <b>{c?.name}</b>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{c?.area} · {d.lines.reduce((n, l) => n + l.filled, 0)} jar</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: d.status === "Delivered" ? "var(--ok)" : "var(--pp-dark)", fontSize: 12 }}>{d.status}</div>
                <b>{money(d.amount)}</b>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Deliveries({ shift }: { shift: Shift }) {
  const a = useAgency();
  const [customerId, setCustomerId] = useState(a.customers[0]?.id || "");
  const [filled, setFilled] = useState(2);
  const [emptyBack, setEmptyBack] = useState(2);
  const rows = a.deliveries.filter((d) => d.shift === shift || d.date.includes("/07/"));
  return (
    <div>
      <div className="pp-hint">Always try to keep zero missing jars — same as load/unload on the plant phone.</div>
      <div className="pp-card" style={{ padding: 12 }}>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Group Name *</div>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="pp-field">
          {a.customers.filter((c) => !c.discarded).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.group}</option>)}
        </select>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0 8px" }}>
          <span style={{ color: "var(--pp-dark)", fontWeight: 500 }}>22 Aug 2026</span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{shift}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div><div style={{ fontSize: 12, color: "var(--muted)" }}>Delivered</div><Step n={filled} set={setFilled} /></div>
          <div><div style={{ fontSize: 12, color: "var(--muted)" }}>Received</div><Step n={emptyBack} set={setEmptyBack} /></div>
        </div>
        <button type="button" className="pp-btn" onClick={() => addDelivery({ customerId, filled, emptyBack, shift })}>New delivery</button>
      </div>
      {rows.map((d) => {
        const c = customer(d.customerId);
        const filledN = d.lines.reduce((n, l) => n + l.filled, 0);
        const empty = d.lines.reduce((n, l) => n + l.emptyBack, 0);
        return (
          <div key={d.id} className="pp-card">
            <div className="pp-row">
              <div className="pp-avatar">{initials(c?.name || "?")}</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "var(--ok)", fontSize: 12, fontWeight: 500 }}>{d.status === "Delivered" ? "Delivered" : "New Delivery"}</div>
                <b>{c?.name}</b>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{c?.phone} · Unbalance jar: {c?.jarsOut}</div>
              </div>
              <b>{money(d.amount)}</b>
            </div>
            <div style={{ padding: "0 12px 12px" }}>
              <div style={{ fontSize: 13, marginBottom: 8 }}>Water Jar · Rate {money(d.lines[0]?.rate ?? 40)}</div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div><div style={{ fontSize: 12, color: "var(--muted)" }}>Delivered</div><Step n={filledN} set={(n) => setDeliveryLine(d.id, n, empty)} /></div>
                <div><div style={{ fontSize: 12, color: "var(--muted)" }}>Received</div><Step n={empty} set={(n) => setDeliveryLine(d.id, filledN, n)} /></div>
              </div>
              {d.status !== "Delivered" ? (
                <button type="button" className="pp-btn" style={{ marginTop: 10 }} onClick={() => markDelivery(d.id, "Delivered")}>Deliver</button>
              ) : <div style={{ marginTop: 8, color: "var(--ok)", fontSize: 13 }}>Create transaction for {d.date}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Customers({ partyId, setPartyId }: { partyId: string | null; setPartyId: (id: string | null) => void }) {
  const a = useAgency();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [opening, setOpening] = useState("");
  const [jars, setJars] = useState("");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "due">("all");
  const [take, setTake] = useState("");
  const [mode, setMode] = useState<PayMode>("Cash");
  const list = a.customers.filter((c) => !c.discarded && (c.name + c.phone + c.area).toLowerCase().includes(q.toLowerCase()) && (tab === "all" || c.credit > 0));
  const open = partyId ? customer(partyId) : undefined;
  const hist = open ? a.deliveries.filter((d) => d.customerId === open.id) : [];
  const pays = open ? a.payments.filter((p) => p.customerId === open.id) : [];
  const bills = open ? a.invoices.filter((i) => i.customerId === open.id) : [];

  if (open) {
    return (
      <div>
        <div className="pp-card">
          <div className="pp-row">
            <div className="pp-avatar">{initials(open.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{open.name}</b>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{open.phone} · {open.area}</div>
            </div>
          </div>
          <div className="pp-th" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <span>Due</span><span>Opening</span><span>Jars</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: 10, fontSize: 13 }}>
            <b>{money(open.credit)}</b><span>{money(open.opening)}</span><span>{open.jarsOut}</span>
          </div>
        </div>
        <form className="pp-card" style={{ padding: 12 }} onSubmit={(e) => {
          e.preventDefault();
          const n = Number(take);
          if (!n) return;
          collectPayment(open.id, n, mode);
          setTake("");
        }}>
          <label className="pp-lab">Collect<input className="pp-field" value={take} onChange={(e) => setTake(e.target.value)} placeholder="₹" /></label>
          <label className="pp-lab">Mode
            <select className="pp-field" value={mode} onChange={(e) => setMode(e.target.value as PayMode)}>
              <option>Cash</option>
              <option>UPI</option>
            </select>
          </label>
          <button type="submit" className="pp-btn">Collect payment</button>
          <button type="button" className="pp-btn-out" style={{ width: "100%", marginTop: 8 }} onClick={() => pauseCustomer(open.id, open.pausedUntil ? null : "30/08/2026")}>{open.pausedUntil ? "Resume" : "Pause"}</button>
        </form>
        <div className="pp-card">
          <div className="pp-th">Bills</div>
          {bills.map((i) => (
            <PetalLink key={i.id} to={`/invoice/${i.id}`} className="pp-row" style={{ textDecoration: "none" }}>
              <span style={{ flex: 1 }}>{i.no} · {i.period}</span>
              <b>{money(i.amountToPay)}</b>
              <span style={{ color: "#bdbdbd" }}>›</span>
            </PetalLink>
          ))}
        </div>
        <div className="pp-card">
          <div className="pp-th">Deliveries</div>
          {hist.map((d) => (
            <div key={d.id} className="pp-row">
              <span style={{ flex: 1 }}>{d.date} · {d.lines.reduce((n, l) => n + l.filled, 0)} jar</span>
              <span>{d.status}</span>
            </div>
          ))}
        </div>
        <div className="pp-card">
          <div className="pp-th">Payments</div>
          {pays.map((p) => (
            <div key={p.id} className="pp-row">
              <span style={{ flex: 1 }}>{p.date} · {p.mode}</span>
              <b>{money(p.amount)}</b>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="pp-card" style={{ display: "flex", marginBottom: 10 }}>
        {(["all", "due"] as const).map((x) => (
          <button key={x} type="button" onClick={() => setTab(x)} style={{ flex: 1, border: 0, background: "transparent", padding: 12, fontWeight: 500, color: tab === x ? "var(--pp-dark)" : "var(--muted)", borderBottom: tab === x ? "3px solid var(--pp)" : "3px solid transparent" }}>{x === "all" ? "All" : "Due"}</button>
        ))}
      </div>
      <input className="pp-field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / mobile" style={{ marginBottom: 10 }} />
      <form className="pp-card" style={{ padding: 12 }} onSubmit={(e) => {
        e.preventDefault();
        if (!name || !phone) return;
        addCustomer({ name, phone, area: area || "—", routeId: "r1", opening: Number(opening) || 0, jarsOut: Number(jars) || 0 });
        setName(""); setPhone(""); setArea(""); setOpening(""); setJars("");
      }}>
        <label className="pp-lab">Customer name<input className="pp-field" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="pp-lab">Mobile<input className="pp-field" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <label className="pp-lab">Address<input className="pp-field" value={area} onChange={(e) => setArea(e.target.value)} /></label>
        <label className="pp-lab">Opening due<input className="pp-field" value={opening} onChange={(e) => setOpening(e.target.value)} /></label>
        <label className="pp-lab">Unbalance jars<input className="pp-field" value={jars} onChange={(e) => setJars(e.target.value)} /></label>
        <button type="submit" className="pp-btn">Add customer</button>
      </form>
      <div className="pp-card">
        {list.map((c) => (
          <button key={c.id} type="button" className="pp-row" style={{ width: "100%", border: 0, textAlign: "left" }} onClick={() => setPartyId(c.id)}>
            <div className="pp-avatar">{initials(c.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{c.name}</b>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.phone} · {c.jarsOut} jars</div>
            </div>
            <b style={{ color: c.credit > 0 ? "var(--bad)" : "var(--ok)", flexShrink: 0 }}>{money(c.credit)}</b>
            <span style={{ color: "#bdbdbd" }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Invoices() {
  const a = useAgency();
  return (
    <div>
      <div className="pp-hint">Craffle-style monthly bill — daily jar grid, past due, amount to pay.</div>
      <button type="button" className="pp-btn" style={{ marginBottom: 10 }} onClick={() => generateInvoices(7, 2026)}>Make July bills</button>
      {a.invoices.map((inv) => {
        const name = customer(inv.customerId)?.name ?? "—";
        const items = inv.lines.map((l) => `${l.product} × ${l.qty}`).join(", ");
        return (
          <article key={inv.id} className="pp-card">
            <div className="pp-row" style={{ alignItems: "flex-start" }}>
              <div style={{ minWidth: 52, height: 40, borderRadius: 8, background: "var(--pp-soft)", color: "var(--pp-dark)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{inv.no}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{name}</b>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{inv.period} · {items}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <b>{money(inv.amountToPay)}</b>
                <div style={{ marginTop: 4 }}><Pill on={inv.status === "Paid"}>{inv.status}</Pill></div>
              </div>
            </div>
            <PetalLink to={`/invoice/${inv.id}`} className="pp-btn" style={{ margin: "0 12px 12px", textAlign: "center", textDecoration: "none" }}>Open / print</PetalLink>
          </article>
        );
      })}
    </div>
  );
}

function Payments() {
  const a = useAgency();
  const due = a.customers.filter((c) => !c.discarded && c.credit > 0);
  const [customerId, setCustomerId] = useState(due[0]?.id || a.customers[0]?.id || "");
  const pick = customer(customerId);
  const [amount, setAmount] = useState(pick ? String(pick.credit) : "");
  const [mode, setMode] = useState<PayMode>("UPI");
  return (
    <div>
      <form className="pp-card" style={{ padding: 12 }} onSubmit={(e) => {
        e.preventDefault();
        const n = Number(amount);
        if (!customerId || !n) return;
        collectPayment(customerId, n, mode);
        setAmount("");
      }}>
        <label className="pp-lab">Customer
          <select className="pp-field" value={customerId} onChange={(e) => {
            setCustomerId(e.target.value);
            const c = customer(e.target.value);
            setAmount(c ? String(c.credit) : "");
          }}>
            {a.customers.filter((c) => !c.discarded).map((c) => <option key={c.id} value={c.id}>{c.name} · due {money(c.credit)}</option>)}
          </select>
        </label>
        <label className="pp-lab">Amount<input className="pp-field" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label className="pp-lab">Mode
          <select className="pp-field" value={mode} onChange={(e) => setMode(e.target.value as PayMode)}>
            <option>Cash</option>
            <option>UPI</option>
          </select>
        </label>
        <button type="submit" className="pp-btn">Collect payment</button>
      </form>
      <div className="pp-card">
        <div className="pp-th">Payment collection</div>
        {a.payments.map((p) => (
          <div key={p.id} className="pp-row">
            <div className="pp-avatar">{initials(customer(p.customerId)?.name || "?")}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{customer(p.customerId)?.name}</b>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.date} · {p.mode}</div>
            </div>
            <b>{money(p.amount)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function Expenses() {
  const a = useAgency();
  const [kind, setKind] = useState<ExpenseKind>("raw_material");
  const [what, setWhat] = useState("");
  const [amount, setAmount] = useState("");
  const [who, setWho] = useState("");
  const [date, setDate] = useState("2026-08-22");
  const totals = EXPENSE_KINDS.filter((k) => k.id !== "other").map((k) => ({
    ...k,
    sum: a.expenses.filter((e) => e.kind === k.id).reduce((n, e) => n + e.amount, 0),
  }));
  return (
    <div>
      <form className="pp-card" style={{ padding: 12 }} onSubmit={(e) => {
        e.preventDefault();
        const n = Number(amount);
        if (!what || !n) return;
        const [y, m, d] = date.split("-");
        addExpense({ date: `${d}/${m}/${y}`, kind, what, amount: n, who: who || "Store", status: "Open" });
        setWhat(""); setAmount("");
      }}>
        <label className="pp-lab">Date<input className="pp-field" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="pp-lab">Head
          <select className="pp-field" value={kind} onChange={(e) => setKind(e.target.value as ExpenseKind)}>
            {EXPENSE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </label>
        <label className="pp-lab">What<input className="pp-field" value={what} onChange={(e) => setWhat(e.target.value)} /></label>
        <label className="pp-lab">Amount<input className="pp-field" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label className="pp-lab">Who<input className="pp-field" value={who} onChange={(e) => setWho(e.target.value)} /></label>
        <button type="submit" className="pp-btn">Add expense</button>
      </form>
      <div className="pp-card">
        <div className="pp-th">Expense heads</div>
        {totals.map((t) => (
          <div key={t.id} className="pp-row">
            <span style={{ flex: 1 }}>{t.label}</span>
            <b>{money(t.sum)}</b>
          </div>
        ))}
      </div>
      <div className="pp-card">
        <div className="pp-th">Entries</div>
        {a.expenses.map((e) => (
          <div key={e.id} className="pp-row" style={{ alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{EXPENSE_KINDS.find((k) => k.id === e.kind)?.label}</b>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.what} · {e.who} · {e.date}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <b>{money(e.amount)}</b>
              <div style={{ marginTop: 4 }}>
                {e.status === "Open"
                  ? <button type="button" className="pp-btn-out" onClick={() => payExpense(e.id)}>Paid</button>
                  : <Pill on>Paid</Pill>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stock() {
  const a = useAgency();
  const withCust = a.customers.reduce((n, c) => n + c.jarsOut, 0);
  const [pid, setPid] = useState("p20");
  const [n, setN] = useState("10");
  return (
    <div>
      <div className="pp-hint">Always try to keep zero missing jars — it will help you prevent stock issues.</div>
      <div className="pp-banner">
        <div style={{ fontSize: 13 }}>Balance product with customers</div>
        <div style={{ fontSize: 28, fontWeight: 500 }}>{withCust}</div>
      </div>
      {a.products.map((p) => (
        <article key={p.id} className="pp-card">
          <div className="pp-row">
            <b style={{ flex: 1 }}>{p.name}</b>
            <span style={{ color: "var(--pp-dark)" }}>{money(p.rate)}</span>
          </div>
          <div className="pp-th" style={{ gridTemplateColumns: "1fr 1fr" }}><span>Filled</span><span>Empty</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: 12, fontSize: 13 }}>
            <div>Load qty: {p.stockFilled}<br />Reorder: {p.reorder}</div>
            <div>Received: {p.stockEmpty}</div>
          </div>
          {p.stockFilled <= p.reorder ? <div style={{ padding: "0 12px 12px" }}><Pill>Low stock</Pill></div> : null}
        </article>
      ))}
      <form className="pp-card" style={{ padding: 12 }} onSubmit={(e) => {
        e.preventDefault();
        const q = Number(n);
        if (!q) return;
        adjustStock(pid, q, 0);
        setN("");
      }}>
        <label className="pp-lab">Product
          <select className="pp-field" value={pid} onChange={(e) => setPid(e.target.value)}>
            {a.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="pp-lab">Quantity<input className="pp-field" value={n} onChange={(e) => setN(e.target.value)} /></label>
        <button type="submit" className="pp-btn">Load filled</button>
        <button type="button" className="pp-btn-out" style={{ width: "100%", marginTop: 8 }} onClick={() => { const q = Number(n); if (q) adjustStock(pid, 0, q); }}>Unload empty</button>
      </form>
    </div>
  );
}

function Staff() {
  const a = useAgency();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  return (
    <div>
      <div className="pp-hint">{a.staff.length}/{MAX_USERS} users. Book salary from here — it goes to Expenses.</div>
      <form className="pp-card" style={{ padding: 12 }} onSubmit={(e) => {
        e.preventDefault();
        if (!name || !phone) return;
        const r = addStaff(name, phone, "staff");
        setNote(r.ok ? "Added." : r.message);
        if (r.ok) { setName(""); setPhone(""); }
      }}>
        <label className="pp-lab">Name<input className="pp-field" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="pp-lab">Mobile<input className="pp-field" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <button type="submit" className="pp-btn" disabled={a.staff.length >= MAX_USERS}>Add user</button>
        {note ? <p style={{ color: "var(--bad)", marginBottom: 0 }}>{note}</p> : null}
      </form>
      <div className="pp-card">
        {a.staff.map((s) => (
          <div key={s.id} className="pp-row" style={{ alignItems: "flex-start" }}>
            <div className="pp-avatar" aria-hidden>{initials(s.name)}</div>
            <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
              <b>{s.name}</b>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.role} · {s.phone} · PIN {s.pin}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Salary {money(s.salary)} · Advance {money(s.advance)}</div>
              {s.salary > 0 ? (
                <button type="button" className="pp-btn-out" style={{ marginTop: 8 }} onClick={() => addExpense({ date: "22/08/2026", kind: "salary", what: `Salary — ${s.name}`, amount: s.salary, who: s.name, status: "Open" })}>Book salary</button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Reports({ s }: { s: ReturnType<typeof todayStats> }) {
  const a = useAgency();
  const payroll = a.staff.reduce((n, x) => n + x.salary + x.expenses - x.advance, 0);
  const sales = a.deliveries.filter((d) => d.status === "Delivered").reduce((n, d) => n + d.amount, 0);
  const spent = a.expenses.reduce((n, e) => n + e.amount, 0);
  const rows = [
    ["Daily collection", money(s.received)],
    ["Outstanding", money(s.due)],
    ["Delivered sales", money(sales)],
    ["All expenses", money(spent)],
    ["Sales − expenses", money(sales - spent)],
    ["20L with customers", String(a.customers.reduce((n, c) => n + c.jarsOut, 0))],
    ["Payroll on staff cards", money(payroll)],
    ["Expenses still open", money(a.expenses.filter((e) => e.status === "Open").reduce((n, e) => n + e.amount, 0))],
    ["Invoices due", String(a.invoices.filter((i) => i.status === "Due").length)],
    ...EXPENSE_KINDS.filter((k) => k.id !== "other").map((k) => [
      k.label,
      money(a.expenses.filter((e) => e.kind === k.id).reduce((n, e) => n + e.amount, 0)),
    ]),
  ];
  return (
    <div>
      <div className="pp-card">
        <div className="pp-th">Daily reports</div>
        {rows.map(([k, v]) => (
          <div key={k} className="pp-row">
            <span style={{ flex: 1 }}>{k}</span>
            <b>{v}</b>
            <span style={{ color: "#bdbdbd" }}>›</span>
          </div>
        ))}
      </div>
      <button type="button" className="pp-btn" onClick={() => {
        const blob = new Blob([reportCsv()], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const el = document.createElement("a");
        el.href = url;
        el.download = "petal-reports.csv";
        el.click();
        URL.revokeObjectURL(url);
      }}>Download CSV</button>
    </div>
  );
}

function Settings() {
  const a = useAgency();
  const [name, setName] = useState(a.name);
  const [store, setStore] = useState(a.store);
  const [address, setAddress] = useState(a.address);
  const [phone, setPhone] = useState(a.phone);
  const [pay, setPay] = useState(a.pay);
  const [saved, setSaved] = useState(false);
  return (
    <form className="pp-card" style={{ padding: 12 }} onSubmit={(e) => {
      e.preventDefault();
      updateStore({ name, store, address, phone, pay });
      setSaved(true);
    }}>
      <div className="pp-hint">{PRODUCT.name} · {a.name} · {a.staff.length}/{MAX_USERS} users · one store</div>
      <label className="pp-lab">Name on bill<input className="pp-field" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="pp-lab">Store name<input className="pp-field" value={store} onChange={(e) => setStore(e.target.value)} /></label>
      <label className="pp-lab">Address on bill<input className="pp-field" value={address} onChange={(e) => setAddress(e.target.value)} /></label>
      <label className="pp-lab">Phone on bill<input className="pp-field" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
      <div className="pp-th" style={{ margin: "8px -12px 8px" }}>Payment options on invoice</div>
      {(["accountName", "bankName", "accountNo", "ifsc", "phonepe", "upi"] as const).map((k) => (
        <label key={k} className="pp-lab">{k}<input className="pp-field" value={pay[k]} onChange={(e) => setPay({ ...pay, [k]: e.target.value })} /></label>
      ))}
      <button type="submit" className="pp-btn">Save</button>
      {saved ? <p style={{ color: "var(--ok)" }}>Saved.</p> : null}
      <button type="button" className="pp-btn-out" style={{ width: "100%", marginTop: 8 }} onClick={() => { resetDemo(); }}>Reset demo data</button>
    </form>
  );
}
