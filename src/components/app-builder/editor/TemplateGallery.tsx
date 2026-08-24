import { useMemo, useState, type ReactNode } from "react";
import { TEMPLATES, type AppPlan, type SheetTab } from "@/lib/app-builder";
import { GlidePhonePreview } from "../glide-phone-preview";

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

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSheetXml(tab: SheetTab) {
  const header = tab.headers
    .map((h) => `<Cell><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`)
    .join("");
  return `<Worksheet ss:Name="${xmlEscape(tab.name.slice(0, 31))}"><Table><Row>${header}</Row></Table></Worksheet>`;
}

function downloadTemplateFormat(plan: AppPlan) {
  const sheets = Object.values(plan.workbook.tabs).map(formatSheetXml).join("");
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${sheets}</Workbook>`;
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${plan.id}-format.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

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
          onPick={props.onPick}
          sheetUrl={props.sheetUrl}
          onSheetUrl={props.onSheetUrl}
          onConnectSheet={props.onConnectSheet}
        />
      ) : null}

      {page === "cases" ? (
        <Cases onPick={props.onPick} />
      ) : null}

      {page === "store" ? (
        <Store
          cat={cat}
          setCat={setCat}
          list={list}
          onPick={props.onPick}
          onInferDemo={props.onInferDemo}
        />
      ) : null}

      {page === "solution" && solution ? (
        <Solution
          selectedId={solution.id}
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

function scrollToTemplate(id: string) {
  document.getElementById(`tpl-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Home({
  prompt,
  setPrompt,
  onBuild,
  onPick,
  sheetUrl,
  onSheetUrl,
  onConnectSheet,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  onBuild?: (p: string) => void;
  onPick: (plan: AppPlan) => void;
  sheetUrl?: string;
  onSheetUrl?: (v: string) => void;
  onConnectSheet?: () => void;
}) {
  return (
    <>
      <section className="gs-home is-lead">
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
        <div className="store-usecases">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" onClick={() => scrollToTemplate(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </section>
      {TEMPLATES.map((plan) => (
        <SolutionSplit key={plan.id} plan={plan} onPick={onPick} />
      ))}
    </>
  );
}

function Cases({ onPick }: { onPick: (plan: AppPlan) => void }) {
  const plans = useMemo(() => {
    const seen = new Set<string>();
    return CASES.flatMap((c) => {
      const plan = TEMPLATES.find((t) => t.id === c.id);
      if (!plan || seen.has(plan.id)) return [];
      seen.add(plan.id);
      return [plan];
    });
  }, []);
  return (
    <section className="gs-page">
      <h1>Use cases</h1>
      <p className="store-lead gs-left">Apps you can start from a Sheet today.</p>
      {plans.map((plan) => (
        <SolutionSplit key={plan.id} plan={plan} compact onPick={onPick} />
      ))}
    </section>
  );
}

function Store({
  cat,
  setCat,
  list,
  onPick,
  onInferDemo,
}: {
  cat: Cat;
  setCat: (c: Cat) => void;
  list: AppPlan[];
  onPick: (plan: AppPlan) => void;
  onInferDemo?: () => void;
}) {
  return (
    <section className="gs-page">
      <h1>Store</h1>
      <p className="store-lead gs-left">
        Same Glide preview for every template. Download the Sheet format, then start.
      </p>
      {onInferDemo ? (
        <button type="button" className="store-ghost gs-demo" onClick={onInferDemo}>
          Build from a demo Sheet
        </button>
      ) : null}
      <div className="store-usecases gs-left-row">
        {CATS.map((c) => (
          <button key={c} type="button" className={cat === c ? "on" : ""} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      {list.map((plan) => (
        <SolutionSplit key={plan.id} plan={plan} compact onPick={onPick} />
      ))}
    </section>
  );
}

function SolutionSplit({
  plan,
  onPick,
  compact,
  before,
  ask,
}: {
  plan: AppPlan;
  onPick: (plan: AppPlan) => void;
  compact?: boolean;
  before?: ReactNode;
  ask?: ReactNode;
}) {
  const Title = compact ? "h2" : "h1";
  return (
    <section
      id={`tpl-${plan.id}`}
      className="gs-split gs-split-app"
    >
      <div>
        {before}
        <p className="store-kicker">{CAT_OF[plan.id] || "App"} software</p>
        <Title>Build {plan.label.toLowerCase()} on your Sheet, with AI</Title>
        <p className="store-lead gs-left">{COPY[plan.id] || plan.blurb}</p>
        {ask}
        <div className="gs-actions">
          <button type="button" className="gs-cta" onClick={() => onPick(plan)}>
            Start for free
          </button>
          <button
            type="button"
            className="gs-cta ghost"
            onClick={() => downloadTemplateFormat(plan)}
          >
            Download Format
          </button>
        </div>
      </div>
      <GlidePhonePreview plan={plan} large />
    </section>
  );
}

function Solution({
  selectedId,
  prompt,
  setPrompt,
  onBuild,
  onPick,
  sheetUrl,
  onSheetUrl,
  onConnectSheet,
}: {
  selectedId: string;
  prompt: string;
  setPrompt: (v: string) => void;
  onBuild?: (p: string) => void;
  onPick: (plan: AppPlan) => void;
  sheetUrl?: string;
  onSheetUrl?: (v: string) => void;
  onConnectSheet?: () => void;
}) {
  const ordered = [
    ...TEMPLATES.filter((t) => t.id === selectedId),
    ...TEMPLATES.filter((t) => t.id !== selectedId),
  ];
  return (
    <>
      {ordered.map((plan, i) => (
        <SolutionSplit
          key={plan.id}
          plan={plan}
          onPick={onPick}
          ask={
            i === 0 ? (
              <AskBar
                prompt={prompt}
                setPrompt={setPrompt}
                onBuild={onBuild}
                sheetUrl={sheetUrl}
                onSheetUrl={onSheetUrl}
                onConnectSheet={onConnectSheet}
              />
            ) : undefined
          }
        />
      ))}
    </>
  );
}
