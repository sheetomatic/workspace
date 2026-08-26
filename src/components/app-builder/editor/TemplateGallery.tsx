import { useMemo, useState } from "react";
import {
  TEMPLATES,
  type AppPlan,
  type SheetTab,
} from "@/lib/app-builder";
import { TEMPLATE_LEAD } from "../app-builder-hero-split";
import { TemplateNamePicker } from "../template-name-picker";

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
  cashbook: "Finance",
  tasks: "Operations",
};

const COPY = TEMPLATE_LEAD;

const CASES = [
  { id: "custom", title: "Portals", body: "A central hub for staff or customers. Link + PIN. No Google seat." },
  { id: "tasks", title: "Dashboards", body: "Open the phone and start. Counts, recent rows, exceptions first." },
  { id: "crm", title: "CRM", body: "Leads and follow-ups tailored to how you actually sell." },
  { id: "inventory", title: "Inventory", body: "Prevent stockouts. In, out, and balances on one Sheet." },
  { id: "orders", title: "Field sales", body: "Orders from the yard or the counter. Lines stay with the order." },
  { id: "attendance", title: "Attendance", body: "Who came, who is late. Feeds the same weekly review." },
  { id: "visitors", title: "Visitors", body: "Gate log that staff can fill without a Google account." },
  { id: "expenses", title: "Spend", body: "Cash out and approve. No WhatsApp photo of a bill." },
  { id: "cashbook", title: "Cashbook", body: "Credits in, debits out, category-wise. No Sheet needed to start." },
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
  onCreateNew?: (prompt: string) => void;
  sheetUrl?: string;
  onSheetUrl?: (url: string) => void;
  onConnectSheet?: () => void;
  onUploadFile?: (file: File) => void;
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
      {props.onBack ? (
        <div className="gs-workspace-back">
          <button type="button" onClick={props.onBack}>
            ← Back to builder
          </button>
        </div>
      ) : null}
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
            <em>AppSheet + Glide</em>
            <small>Formulas and bots. Screens that look finished. Gmail Sheet + PIN.</small>
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
          onCreateNew={props.onCreateNew}
          onPick={props.onPick}
          sheetUrl={props.sheetUrl}
          onSheetUrl={props.onSheetUrl}
          onConnectSheet={props.onConnectSheet}
          onUploadFile={props.onUploadFile}
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
          onCreateNew={props.onCreateNew}
          onPick={props.onPick}
          sheetUrl={props.sheetUrl}
          onSheetUrl={props.onSheetUrl}
          onConnectSheet={props.onConnectSheet}
          onUploadFile={props.onUploadFile}
        />
      ) : null}
    </div>
  );
}

function AskBar({
  prompt,
  setPrompt,
  onBuild,
  onCreateNew,
  sheetUrl,
  onSheetUrl,
  onConnectSheet,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  onBuild?: (p: string) => void;
  onCreateNew?: (p: string) => void;
  sheetUrl?: string;
  onSheetUrl?: (v: string) => void;
  onConnectSheet?: () => void;
  onUploadFile?: (file: File) => void;
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
        <button
          type="button"
          className="store-ai"
          disabled={!prompt.trim()}
          onClick={() => onBuild?.(prompt)}
        >
          Build with AI
        </button>
      </div>
      {onSheetUrl ? (
        <div className="store-url-row">
          <input
            className="store-url"
            value={sheetUrl}
            onChange={(e) => onSheetUrl(e.target.value)}
            placeholder="Or paste a Google Sheet link"
            onKeyDown={(e) => {
              if (e.key === "Enter" && sheetUrl?.trim()) onConnectSheet?.();
            }}
          />
          <button
            type="button"
            className="store-open-sheet"
            onClick={onConnectSheet}
          >
            Open Sheet
          </button>
        </div>
      ) : null}
      {onCreateNew ? (
        <div className="store-new-sheet">
          <button type="button" className="store-new-sheet-btn" onClick={() => onCreateNew(prompt)}>
            Create new spreadsheet
          </button>
          <p>No Sheet yet? We make one from your words — Cashbook, CRM, or a blank table.</p>
        </div>
      ) : null}
    </>
  );
}

function Home({
  prompt,
  setPrompt,
  onBuild,
  onCreateNew,
  onPick,
  sheetUrl,
  onSheetUrl,
  onConnectSheet,
  onUploadFile,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  onBuild?: (p: string) => void;
  onCreateNew?: (p: string) => void;
  onPick: (plan: AppPlan) => void;
  sheetUrl?: string;
  onSheetUrl?: (v: string) => void;
  onConnectSheet?: () => void;
  onUploadFile?: (file: File) => void;
}) {
  return (
    <>
      <section className="gs-home is-lead">
        <h1>AppSheet power. Glide screens. Your Sheet.</h1>
        <p className="store-lead">
          Formulas, refs, and bots like AppSheet. Phone, tablet, and desktop like
          Glide. No spreadsheet yet? Describe the app. Or upload, paste a link,
          or pick a template. Staff use a link and PIN — no Workspace seat.
        </p>
        <AskBar
          prompt={prompt}
          setPrompt={setPrompt}
          onBuild={onBuild}
          onCreateNew={onCreateNew}
          sheetUrl={sheetUrl}
          onSheetUrl={onSheetUrl}
          onConnectSheet={onConnectSheet}
          onUploadFile={onUploadFile}
        />
        <TemplateNamePicker
          templates={TEMPLATES}
          onPick={onPick}
          onFormat={downloadTemplateFormat}
        />
      </section>
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
      <TemplateNamePicker
        templates={plans}
        onPick={onPick}
        onFormat={downloadTemplateFormat}
      />
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
      <TemplateNamePicker
        templates={list}
        onPick={onPick}
        onFormat={downloadTemplateFormat}
      />
    </section>
  );
}

function Solution({
  selectedId,
  prompt,
  setPrompt,
  onBuild,
  onCreateNew,
  onPick,
  sheetUrl,
  onSheetUrl,
  onConnectSheet,
  onUploadFile,
}: {
  selectedId: string;
  prompt: string;
  setPrompt: (v: string) => void;
  onBuild?: (p: string) => void;
  onCreateNew?: (p: string) => void;
  onPick: (plan: AppPlan) => void;
  sheetUrl?: string;
  onSheetUrl?: (v: string) => void;
  onConnectSheet?: () => void;
  onUploadFile?: (file: File) => void;
}) {
  const ordered = [
    ...TEMPLATES.filter((t) => t.id === selectedId),
    ...TEMPLATES.filter((t) => t.id !== selectedId),
  ];
  return (
    <>
      <section className="gs-home is-lead">
        <AskBar
          prompt={prompt}
          setPrompt={setPrompt}
          onBuild={onBuild}
          onCreateNew={onCreateNew}
          sheetUrl={sheetUrl}
          onSheetUrl={onSheetUrl}
          onConnectSheet={onConnectSheet}
          onUploadFile={onUploadFile}
        />
      </section>
      <TemplateNamePicker
        templates={ordered}
        initialId={selectedId}
        onPick={onPick}
        onFormat={downloadTemplateFormat}
      />
    </>
  );
}
