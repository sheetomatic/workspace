import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  FileInput,
  FileOutput,
  FolderTree,
  GitBranch,
  History,
  LayoutDashboard,
  MapPin,
  Package,
  PackageSearch,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
} from "lucide-react";
import {
  STORE_DASHBOARD_MODULES,
  STORE_MASTER_MODULES,
  STORE_REPORT_MODULES,
  type StoreModuleDef,
} from "@/lib/ims/store-modules";
import { IMS_SALES_ORDER_STOCK_PATH } from "@/lib/ims/sales-order-stock";

export type ImsNavItem = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  phase2?: boolean;
};

export type ImsNavSection = {
  title: string;
  items: ImsNavItem[];
};

const MODULE_ICONS: Record<string, LucideIcon> = {
  mr: ClipboardList,
  indent: ClipboardList,
  grn: FileInput,
  min: FileOutput,
  po: GitBranch,
  purchase: FileInput,
  register: ClipboardList,
  stock: PackageSearch,
  groups: FolderTree,
  items: Package,
  vendors: Truck,
  uom: Package,
  rack: MapPin,
  reports: BarChart3,
  movements: History,
  consumption: BarChart3,
  "physical-stock": PackageSearch,
  wastage: FileOutput,
  "gate-pass": ArrowLeftRight,
};

function moduleToNavItem(mod: StoreModuleDef): ImsNavItem {
  return {
    id: mod.id,
    href: mod.href ?? `/app/ims/roadmap/${mod.id}`,
    label: mod.label,
    icon: MODULE_ICONS[mod.id] ?? Package,
    description: mod.description,
    phase2: mod.status === "phase2",
  };
}

/** Sidebar navigation — all store modules live here (dashboard = analytics only). */
export const IMS_NAV_SECTIONS: ImsNavSection[] = [
  {
    title: "Overview",
    items: [
      {
        id: "dashboard",
        href: "/app/ims",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Numbers and exceptions",
      },
    ],
  },
  {
    title: "Transactions",
    items: STORE_DASHBOARD_MODULES.filter((m) =>
      [
        "mr",
        "indent",
        "grn",
        "min",
        "po",
        "purchase",
        "physical-stock",
        "wastage",
        "gate-pass",
      ].includes(m.id),
    ).map(moduleToNavItem),
  },
  {
    title: "Masters",
    items: STORE_MASTER_MODULES.map(moduleToNavItem),
  },
  {
    title: "Stock & QC",
    items: [
      ...STORE_DASHBOARD_MODULES.filter((m) => ["stock", "register"].includes(m.id)).map(
        moduleToNavItem,
      ),
      {
        id: "sales-order-stock",
        href: IMS_SALES_ORDER_STOCK_PATH,
        label: "Sales order stock",
        icon: ShoppingCart,
        description: "IMS check for open orders",
      },
      {
        id: "qc",
        href: "/app/ims/qc",
        label: "QC queue",
        icon: ClipboardCheck,
        description: "Pass or fail receipts",
      },
      {
        id: "move-all",
        href: "/app/ims/move",
        label: "All movements",
        icon: ArrowLeftRight,
        description: "RM In, FG, adjust",
      },
      ...STORE_REPORT_MODULES.filter((m) => m.id === "movements").map(moduleToNavItem),
    ],
  },
  {
    title: "Reports",
    items: [
      ...STORE_REPORT_MODULES.filter((m) => m.id !== "movements").map(moduleToNavItem),
      {
        id: "settings",
        href: "/app/ims/settings",
        label: "Form settings",
        icon: SlidersHorizontal,
        description: "Customise item & vendor forms",
      },
    ],
  },
];

export function imsNavItemKey(item: Pick<ImsNavItem, "id" | "href">) {
  return `${item.id}::${item.href}`;
}

export function imsNavIsActive(pathname: string, href: string) {
  const path = href.split("?")[0] ?? href;
  if (path === "/app/ims") {
    return pathname === "/app/ims";
  }
  if (path === "/app/fms/fulfillment") {
    return pathname.startsWith("/app/fms/fulfillment");
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}
