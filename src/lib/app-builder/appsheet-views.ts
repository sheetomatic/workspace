import type { AppView, CollectionStyle, ViewKind } from "./index";

export const APPSHEET_VIEW_TYPES: {
  id: ViewKind;
  label: string;
  style: CollectionStyle;
}[] = [
  { id: "calendar", label: "Calendar", style: "calendar" },
  { id: "deck", label: "Deck", style: "list" },
  { id: "table", label: "Table", style: "table" },
  { id: "gallery", label: "Gallery", style: "cards" },
  { id: "detail", label: "Detail", style: "list" },
  { id: "map", label: "Map", style: "list" },
  { id: "chart", label: "Chart", style: "chart" },
  { id: "dashboard", label: "Dashboard", style: "list" },
  { id: "form", label: "Form", style: "list" },
  { id: "card", label: "Card", style: "cards" },
  { id: "menu", label: "Onboarding / menu", style: "list" },
];

export const MENU_ICONS: { id: string; label: string }[] = [
  { id: "users", label: "People" },
  { id: "leads", label: "Leads" },
  { id: "cart", label: "Orders" },
  { id: "box", label: "Stock" },
  { id: "cash", label: "Money" },
  { id: "calendar", label: "Calendar" },
  { id: "check", label: "Tasks" },
  { id: "file", label: "Files" },
  { id: "home", label: "Home" },
  { id: "map", label: "Map" },
];

export function defaultIconForView(name: string): string {
  if (/lead|crm|customer|party/i.test(name)) return "leads";
  if (/order|sale|cart/i.test(name)) return "cart";
  if (/stock|item|invent/i.test(name)) return "box";
  if (/cash|expens|pay|money/i.test(name)) return "cash";
  if (/task|todo|attend/i.test(name)) return "check";
  if (/visit|map/i.test(name)) return "map";
  if (/file|doc/i.test(name)) return "file";
  if (/calendar|follow/i.test(name)) return "calendar";
  return "users";
}

export function applyAppSheetViewType(view: AppView, kind: ViewKind): Partial<AppView> {
  const hit = APPSHEET_VIEW_TYPES.find((item) => item.id === kind);
  return {
    kind,
    collectionStyle: hit?.style || view.collectionStyle || "list",
    cardLayout: kind === "card" || kind === "gallery" ? view.cardLayout || "photo" : view.cardLayout,
  };
}
