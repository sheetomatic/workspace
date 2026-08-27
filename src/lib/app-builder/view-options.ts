import type {
  AppConfig,
  AppUser,
  AppView,
  CardLayout,
  GroupAggregate,
  SheetRow,
  ViewPosition,
  ViewSort,
} from "./index";
import { cellStr } from "./index";
import { formulaTrue } from "./behavior";
import { interpolateTemplate } from "./automation";

const POSITION_RANK: Record<ViewPosition, number> = {
  first: 0,
  next: 1,
  middle: 2,
  later: 3,
  last: 4,
  menu: 5,
  ref: 6,
};

export const VIEW_POSITIONS: { id: ViewPosition; label: string }[] = [
  { id: "first", label: "first" },
  { id: "next", label: "next" },
  { id: "middle", label: "middle" },
  { id: "later", label: "later" },
  { id: "last", label: "last" },
  { id: "menu", label: "menu" },
  { id: "ref", label: "ref" },
];

export const CARD_LAYOUTS: { id: CardLayout; label: string }[] = [
  { id: "list", label: "list" },
  { id: "photo", label: "photo" },
  { id: "backdrop", label: "backdrop" },
  { id: "large", label: "large" },
];

export function viewPosition(view: AppView): ViewPosition {
  if (view.position) return view.position;
  if (view.nav === false) return "ref";
  return "middle";
}

export function orderViews(views: AppView[]): AppView[] {
  return [...views].sort((a, b) => POSITION_RANK[viewPosition(a)] - POSITION_RANK[viewPosition(b)]);
}

export function primaryViews(config: AppConfig): AppView[] {
  return orderViews(
    config.views.filter((view) => {
      const slot = viewPosition(view);
      return slot !== "menu" && slot !== "ref";
    }),
  );
}

export function menuViews(config: AppConfig): AppView[] {
  return config.views.filter((view) => viewPosition(view) === "menu");
}

export function refViews(config: AppConfig): AppView[] {
  return config.views.filter((view) => viewPosition(view) === "ref");
}

export function withViewPosition(position: ViewPosition): Pick<AppView, "position" | "nav"> {
  return {
    position,
    nav: position !== "menu" && position !== "ref",
  };
}

export function viewShown(view: AppView, user?: AppUser) {
  return formulaTrue(view.showIf, {}, user, true);
}

export function viewLabel(view: AppView, row?: Record<string, string | number | boolean | null>) {
  const raw = view.displayName?.trim();
  if (!raw) return view.name;
  const unquoted = raw.match(/^"(.*)"$/)?.[1];
  if (unquoted != null) return unquoted;
  return interpolateTemplate(raw, row || {});
}

export function sortViewRows(rows: SheetRow[], sorts?: ViewSort[]): SheetRow[] {
  if (!sorts?.length) return rows;
  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const left = cellStr(a, sort.col);
      const right = cellStr(b, sort.col);
      const numL = Number(String(left).replace(/,/g, ""));
      const numR = Number(String(right).replace(/,/g, ""));
      let cmp = 0;
      if (Number.isFinite(numL) && Number.isFinite(numR) && left !== "" && right !== "") {
        cmp = numL - numR;
      } else {
        cmp = left.localeCompare(right, "en", { numeric: true });
      }
      if (cmp) return sort.dir === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

export function groupViewRows(rows: SheetRow[], cols?: string[]): { key: string; rows: SheetRow[] }[] {
  const col = cols?.[0];
  if (!col) return [{ key: "", rows }];
  const buckets = new Map<string, SheetRow[]>();
  for (const row of rows) {
    const key = cellStr(row, col) || "(blank)";
    const list = buckets.get(key) || [];
    list.push(row);
    buckets.set(key, list);
  }
  return [...buckets.entries()].map(([key, list]) => ({ key, rows: list }));
}

export function groupAggregateValue(
  rows: SheetRow[],
  kind?: GroupAggregate,
  col?: string,
): string {
  if (!kind || kind === "none") return String(rows.length);
  if (kind === "count") return String(rows.length);
  const nums = rows
    .map((row) => Number(String(row.cells[col || ""] ?? "").replace(/,/g, "")))
    .filter((n) => Number.isFinite(n));
  if (!nums.length) return "0";
  const sum = nums.reduce((a, b) => a + b, 0);
  if (kind === "sum") return String(sum);
  return String(Math.round((sum / nums.length) * 100) / 100);
}

export function linkToViewExpr(name: string) {
  return `LINKTOVIEW("${name}")`;
}
