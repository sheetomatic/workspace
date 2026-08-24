import { useMemo, useState } from "react";
import { TEMPLATES, type AppPlan } from "@/lib/app-builder";

type Page = "home" | "cases" | "store" | "solution";
type Cat = "All" | "Sales" | "Inventory" | "Operations" | "Finance" | "Custom";

const CATS: Cat[] = ["All", "Sales", "Inventory", "Operations", "Finance", "Custom"];

const CAT_OF: Record<string, Cat> = {
  custom: "Custom",
  orders: "Sales",
  crm: "Sales",
  inventory: "Inventory",
  attendance: "Operations",
  visitors: "Operations",
  expenses: "Finance",
  tasks: "Operations",
};

const COPY: Record<string, string> = {
  custom: "A secure desk for staff or customers. One table you name, then add columns.",
  orders: "Parties, items, and line items. Staff add an order; lines stay on the parent.",
  crm: "A CRM for your pipeline, follow-ups, and parties — not a row dump.",
  inventory: "Stay ahead of demand. Items, stock in, stock out, on the phone.",
  attendance: "Staff in/out and leave. Owner sees deficit, not a register book.",
  visitors: "Gate in/out with who and when. No paper at the door.",
  expenses: "Submit and approve cash out. Owner sees what left the till.",
  tasks: "Assign, due, close. Person-wise work without a second sheet.",
};

const CASES = [
  { id: "custom", title: "Portals", body: "A central hub for staff or customers. Link + PIN. No Google seat." },
  { id: "tasks", title: "Dashboards", body: "Open the phone and start. Counts, recent rows, exceptions first." },
  { id: "crm", title: "CRM", body: "Leads and follow-ups tailored to how you actually sell." },
  { id: "inventory", title: "Inventory", body: "Prevent stockouts. In, out, and balances on one Sheet." },
  { id: "orders", title: "Field sales", body: "Orders from the yard or the counter. Lines stay with the order." },
  { id: "attendance", title: "Attendance", body: "Who came, who is late. Feeds the same weekly review." },
  { id: "visitors", title: "Visitors", body: "Gate log that staff can fill without a Google account." },
  { id: "expenses", title: "Spend", body: "Cash out and approve. No WhatsApp photo of a bill." },
  { id: "tasks", title: "Work orders", body: "Assign work, due date, close. Owner sees who is behind." },
] as const;

const INDUSTRIES = [
  "Manufacturing",
  "Retail",
  "Clinic",
  "Services",
  "Jewellery",
  "Furniture",
];

type Props = {
  onPick: (plan: AppPlan) => void;
  onBack?: () => void;
  onInferDemo?: () => void;
  onBuild?: (prompt: string) => void;
  sheetUrl?: string;
  onSheetUrl?: (url: string) => void;
  onConnectSheet?: () => void;
};

export function TemplateGallery(props: Props) {
  const [page, setPage] = useState<Page>("home");
  const [menu, setMenu] = useState(false);
  const [cat, setCat] = useState<Cat>("All");
  const [prompt, setPrompt] = useState("");
  const [solutionId, setSolutionId] = useState("inventory");

  const featured = TEMPLATES.find((t) => t.id === "orders") || TEMPLATES[1];
  const solution = TEMPLATES.find((t) => t.id === solutionId) || featured;
  const list = TEMPLATES.filter((t) => cat === "All" || CAT_OF[t.id] === cat);

  function openSolution(id: string) {
    setSolutionId(id);
    setPage("solution");
    setMenu(false);
  }

  return (
    <div className="gs">
      <header className="gs-nav">
        <button type="button" className="gs-logo" onClick={() => setPage("home")}>
          <i>S</i> Sheetomatic
        </button>
        <nav>
          <button
            type="button"
            className={menu || page === "solution" ? "on" : ""}
            onClick={() => setMenu((v) => !v)}
          >
            Product
          </button>
          <button type="button" className={page === "cases" ? "on" : ""} onClick={() => { setPage("cases"); setMenu(false); }}>
            Use cases
          </button>
          <button type="button" className={page === "store" ? "on" : ""} onClick={() => { setPage("store"); setMenu(false); }}>
            Store
          </button>
        </nav>
        <div className="gs-nav-end">
          {props.onBack ? (
            <button type="button" className="gs-text" onClick={props.onBack}>
              Builder
            </button>
          ) : null}
          <button type="button" className="gs-cta" onClick={() => setPage("store")}>
            Start for free
          </button>
        </div>
      </header>

      {menu ? (
        <div className="gs-mega">
          <div>
            <p>By use case</p>
            <ul>
              {TEMPLATES.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => openSolution(t.id)}>
                    <b>{t.label}</b>
                    <span>{COPY[t.id] || t.blurb}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p>By industry</p>
            <ul className="gs-industries">
              {INDUSTRIES.map((name) => (
                <li key={name}>
                  <button type="button" onClick={() => setPage("cases")}>
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <aside>
            <em>From Sheet to phone</em>
            <small>Connect a Gmail Sheet. Infer screens. Staff use PIN.</small>
            <button type="button" className="gs-cta" onClick={() => setPage("store")}>
              See the store
            </button>
          </aside>
        </div>
      ) : null}

      {page === "home" ? (
        <Home
          prompt={prompt}
          setPrompt={setPrompt}
          onBuild={props.onBuild}
          sheetUrl={props.sheetUrl}
          onSheetUrl={props.onSheetUrl}
          onConnectSheet={props.onConnectSheet}
          onCase={openSolution}
        />
      ) : null}

      {page === "cases" ? (
        <Cases onOpen={openSolution} />
      ) : null}

      {page === "store" ? (
        <Store
          cat={cat}
          setCat={setCat}
          featured={featured}
          list={list}
          onPick={props.onPick}
          onInferDemo={props.onInferDemo}
        />
      ) : null}

      {page === "solution" && solution ? (
        <Solution
          plan={solution}
          prompt={prompt}
          setPrompt={setPrompt}
          onBuild={props.onBuild}
          onPick={props.onPick}
          sheetUrl={props.sheetUrl}
          onSheetUrl={props.onSheetUrl}
          onConnectSheet={props.onConnectSheet}
        />
      ) : null}
    </div>
  );
}

function AskBar({
  prompt,
  setPrompt,
  onBuild,
  sheetUrl,
  onSheetUrl,
  onConnectSheet,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  onBuild?: (p: string) => void;
  sheetUrl?: string;
  onSheetUrl?: (v: string) => void;
  onConnectSheet?: () => void;
}) {
  return (
    <>
      <div className="store-ask">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to build…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && prompt.trim()) onBuild?.(prompt);
          }}
        />
        <button type="button" className="store-upload" onClick={onConnectSheet}>
          Upload spreadsheet
        </button>
        <button
          type="button"
          className="store-go"
          aria-label="Build"
          disabled={!prompt.trim()}
          onClick={() => onBuild?.(prompt)}
        >
          ↑
        </button>
      </div>
      {onSheetUrl ? (
        <input
          className="store-url"
          value={sheetUrl}
          onChange={(e) => onSheetUrl(e.target.value)}
          placeholder="Paste a Google Sheet link, then Upload spreadsheet"
        />
      ) : null}
    </>
  );
}

function Home({
  prompt,
  setPrompt,
  onBuild,
  sheetUrl,
  onSheetUrl,
  onConnectSheet,
  onCase,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  onBuild?: (p: string) => void;
  sheetUrl?: string;
  onSheetUrl?: (v: string) => void;
  onConnectSheet?: () => void;
  onCase: (id: string) => void;
}) {
  const pills = useMemo(
    () => [
      { id: "orders", label: "Field operations" },
      { id: "inventory", label: "Inventory" },
      { id: "visitors", label: "Events" },
      { id: "custom", label: "Customer portals" },
      { id: "tasks", label: "Internal operations" },
    ],
    [],
  );
  return (
    <section className="gs-home">
      <h1>Turn your spreadsheets into apps that run your business</h1>
      <p className="store-lead">
        Build on a Gmail Sheet. Staff need a link and PIN — not a Google account.
      </p>
      <AskBar
        prompt={prompt}
        setPrompt={setPrompt}
        onBuild={onBuild}
        sheetUrl={sheetUrl}
        onSheetUrl={onSheetUrl}
        onConnectSheet={onConnectSheet}
      />
      <div className="gs-floors">
        <button type="button" className="gs-floor" onClick={() => onCase("orders")}>
          <em>Yard</em>
          <b>Dispatch · weighment · party</b>
          <span>Orders from the gate. Lines stay on the parent.</span>
        </button>
        <button type="button" className="gs-floor" onClick={() => onCase("crm")}>
          <em>Office</em>
          <b>Orders · follow-up · cash</b>
          <span>CRM and cash out without a second Sheet.</span>
        </button>
        <button type="button" className="gs-floor" onClick={() => onCase("tasks")}>
          <em>Review</em>
          <b>Weekly EM · deficit · not prep</b>
          <span>Open the phone. Exceptions first — not a slide deck.</span>
        </button>
      </div>
      <div className="store-usecases">
        {pills.map((p) => (
          <button key={p.id} type="button" onClick={() => onCase(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function Cases({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <section className="gs-page">
      <h1>Use cases</h1>
      <p className="store-lead gs-left">Apps you can start from a Sheet today.</p>
      <div className="gs-cards">
        {CASES.map((c) => {
          const plan = TEMPLATES.find((t) => t.id === c.id);
          return (
            <button key={c.title} type="button" className="gs-card" onClick={() => onOpen(c.id)}>
              <div className="gs-card-art">
                <PhonePreview plan={plan} />
              </div>
              <strong>{c.title}</strong>
              <span>{c.body}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Store({
  cat,
  setCat,
  featured,
  list,
  onPick,
  onInferDemo,
}: {
  cat: Cat;
  setCat: (c: Cat) => void;
  featured?: AppPlan;
  list: AppPlan[];
  onPick: (plan: AppPlan) => void;
  onInferDemo?: () => void;
}) {
  return (
    <section className="gs-page">
      {featured ? (
        <div className="store-featured">
          <div>
            <p className="store-kicker">Featured</p>
            <h2>{featured.label}</h2>
            <p>{COPY[featured.id] || featured.blurb}</p>
            <button type="button" className="store-get" onClick={() => onPick(featured)}>
              Get
            </button>
            {onInferDemo ? (
              <button type="button" className="store-ghost" onClick={onInferDemo}>
                Build from a demo Sheet
              </button>
            ) : null}
          </div>
          <PhonePreview plan={featured} />
        </div>
      ) : null}
      <div className="store-usecases gs-left-row">
        {CATS.map((c) => (
          <button key={c} type="button" className={cat === c ? "on" : ""} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <h3 className="gs-h3">Ready apps</h3>
      <div className="store-list">
        {list.map((plan) => (
          <article key={plan.id} className="store-row">
            <span className="store-mark">{plan.label.slice(0, 1)}</span>
            <div>
              <strong>{plan.label}</strong>
              <p>{COPY[plan.id] || plan.blurb}</p>
            </div>
            <button type="button" className="store-get" onClick={() => onPick(plan)}>
              Get
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Solution({
  plan,
  prompt,
  setPrompt,
  onBuild,
  onPick,
  sheetUrl,
  onSheetUrl,
  onConnectSheet,
}: {
  plan: AppPlan;
  prompt: string;
  setPrompt: (v: string) => void;
  onBuild?: (p: string) => void;
  onPick: (plan: AppPlan) => void;
  sheetUrl?: string;
  onSheetUrl?: (v: string) => void;
  onConnectSheet?: () => void;
}) {
  return (
    <section className="gs-split">
      <div>
        <p className="store-kicker">{CAT_OF[plan.id] || "App"} software</p>
        <h1>Build {plan.label.toLowerCase()} on your Sheet, with AI</h1>
        <p className="store-lead gs-left">{COPY[plan.id] || plan.blurb}</p>
        <AskBar
          prompt={prompt}
          setPrompt={setPrompt}
          onBuild={onBuild}
          sheetUrl={sheetUrl}
          onSheetUrl={onSheetUrl}
          onConnectSheet={onConnectSheet}
        />
        <button type="button" className="gs-cta" onClick={() => onPick(plan)}>
          Start for free
        </button>
      </div>
      <PhonePreview plan={plan} large />
    </section>
  );
}

function PhonePreview({ plan, large }: { plan?: AppPlan; large?: boolean }) {
  if (!plan) return <div className="store-device" />;
  const tab = Object.values(plan.workbook.tabs)[0];
  return (
    <div className={large ? "store-device is-large" : "store-device"} aria-hidden>
      <div className="store-device-screen">
        <em>{plan.config.meta.name}</em>
        {tab ? (
          <div className="tpl-preview">
            <div className="tpl-preview-head">
              {tab.headers.slice(0, 4).map((h) => (
                <b key={h}>{h}</b>
              ))}
            </div>
            {tab.rows.slice(0, large ? 4 : 3).map((row) => (
              <div key={row._row} className="tpl-preview-row">
                {tab.headers.slice(0, 4).map((h) => (
                  <i key={h}>{String(row.cells[h] ?? "")}</i>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
