/** Store module map for Sheetomatic IMS (BCI-style, exceptions-first). */

export type StoreModuleStatus = "live" | "phase2";

export type StoreModuleDef = {
  id: string;
  label: string;
  description: string;
  href?: string;
  status: StoreModuleStatus;
};

export const STORE_DASHBOARD_MODULES: StoreModuleDef[] = [
  {
    id: "mr",
    label: "Material requisitions",
    description: "Request materials from store — approve before indent or issue.",
    href: "/app/ims/requisitions",
    status: "live",
  },
  {
    id: "indent",
    label: "Indents",
    description: "Purchase requests to vendors (links from approved MR).",
    href: "/app/ims/indents",
    status: "live",
  },
  {
    id: "grn",
    label: "GRN — goods receipt",
    description: "Record materials received against PO or direct receipt.",
    href: "/app/ims/grn",
    status: "live",
  },
  {
    id: "min",
    label: "MIN — material issue",
    description: "Issue stock to production or site from current balance.",
    href: "/app/ims/min",
    status: "live",
  },
  {
    id: "po",
    label: "Purchase orders",
    description: "Vendor PO with rates — raise from approved indent, then GRN.",
    href: "/app/ims/purchase-orders",
    status: "live",
  },
  {
    id: "purchase",
    label: "Purchase bills",
    description: "Final bill entry against GRN.",
    href: "/app/ims/purchase",
    status: "live",
  },
  {
    id: "physical-stock",
    label: "Physical stock count",
    description: "Cycle count vs system balance.",
    href: "/app/ims/physical-stock",
    status: "live",
  },
  {
    id: "wastage",
    label: "Wastage",
    description: "Scrap and wastage vouchers.",
    href: "/app/ims/wastage",
    status: "live",
  },
  {
    id: "gate-pass",
    label: "Gate pass",
    description: "Material out pass at gate.",
    href: "/app/ims/gate-pass",
    status: "live",
  },
  {
    id: "register",
    label: "Stock register",
    description: "Item-wise ledger — opening, in, out, closing.",
    href: "/app/ims/register",
    status: "live",
  },
  {
    id: "stock",
    label: "Stock on screen",
    description: "Real-time usable qty with reorder exceptions.",
    href: "/app/ims/stock",
    status: "live",
  },
];

export const STORE_MASTER_MODULES: StoreModuleDef[] = [
  {
    id: "groups",
    label: "Item groups",
    description: "Aggregate, assets, consumables — hierarchy for items.",
    href: "/app/ims/groups",
    status: "live",
  },
  {
    id: "items",
    label: "Items",
    description: "Item master with UOM, min/reorder, ABC, QC policy.",
    href: "/app/ims/items",
    status: "live",
  },
  {
    id: "vendors",
    label: "Vendors",
    description: "Supplier master for PO and GRN.",
    href: "/app/ims/vendors",
    status: "live",
  },
  {
    id: "uom",
    label: "Units of measure",
    description: "Per-item UOM on master.",
    href: "/app/ims/items",
    status: "live",
  },
  {
    id: "rack",
    label: "Sections / racks",
    description: "Bin locations for items.",
    href: "/app/ims/racks",
    status: "live",
  },
];

export const STORE_REPORT_MODULES: StoreModuleDef[] = [
  {
    id: "reports",
    label: "IMS reports",
    description: "Valuation, ABC, movement trends, export.",
    href: "/app/ims/reports",
    status: "live",
  },
  {
    id: "movements",
    label: "Movement history",
    description: "All stock transactions with filters.",
    href: "/app/ims/movements",
    status: "live",
  },
  {
    id: "consumption",
    label: "Consumption",
    description: "Issue-based consumption by period.",
    href: "/app/ims/consumption",
    status: "live",
  },
];

export const STORE_PHASE3_MODULES: StoreModuleDef[] = [];

export const STORE_ROADMAP_SOURCES = [
  {
    id: "meta",
    label: "Meta / Facebook Lead Ads",
    description: "Lead forms → Leads Machine (Settings → Lead sources).",
    href: "/app/leads/settings#lead-sources",
  },
  {
    id: "instagram",
    label: "Instagram",
    description: "DM and ad leads — next phase connector.",
    href: "/app/leads/settings#lead-sources",
  },
  {
    id: "telegram",
    label: "Telegram",
    description: "Bot intake — next phase connector.",
    href: "/app/leads/settings#lead-sources",
  },
] as const;
