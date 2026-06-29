import { siteBrand } from "@/app/site-content";

export const WORKSPACE_LOGO_API_PATH = "/api/workspace/logo";

export type ThemePreset = "default" | "ocean" | "forest" | "sunset" | "royal" | "custom";

export type WorkspaceAppearance = {
  preset: ThemePreset;
  primary: string;
  sidebar: string;
  sidebarHover: string;
  background: string;
  productName: string;
  brandName: string;
};

export const THEME_PRESETS: Record<
  Exclude<ThemePreset, "custom">,
  Pick<WorkspaceAppearance, "primary" | "sidebar" | "sidebarHover" | "background">
> = {
  default: {
    primary: "#2563eb",
    sidebar: "#0d47a1",
    sidebarHover: "#1565c0",
    background: "#f1f5f9",
  },
  ocean: {
    primary: "#0891b2",
    sidebar: "#082f49",
    sidebarHover: "#0e4d6e",
    background: "#ecfeff",
  },
  forest: {
    primary: "#16a34a",
    sidebar: "#052e16",
    sidebarHover: "#166534",
    background: "#f0fdf4",
  },
  sunset: {
    primary: "#ea580c",
    sidebar: "#431407",
    sidebarHover: "#9a3412",
    background: "#fff7ed",
  },
  royal: {
    primary: "#7c3aed",
    sidebar: "#1e1b4b",
    sidebarHover: "#312e81",
    background: "#f5f3ff",
  },
};

export const DEFAULT_WORKSPACE_APPEARANCE: WorkspaceAppearance = {
  preset: "default",
  ...THEME_PRESETS.default,
  productName: "Sheetomatic",
  brandName: siteBrand.name,
};

export function listThemePresets(): ThemePreset[] {
  return ["default", "ocean", "forest", "sunset", "royal", "custom"];
}

export function getPresetLabel(preset: ThemePreset) {
  const labels: Record<ThemePreset, string> = {
    default: "Default Blue",
    ocean: "Ocean",
    forest: "Forest",
    sunset: "Sunset",
    royal: "Royal",
    custom: "Custom",
  };
  return labels[preset];
}

export function parseWorkspaceAppearance(
  value: unknown,
): Partial<WorkspaceAppearance> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Partial<WorkspaceAppearance>;
}

export function mergeWorkspaceAppearance(
  stored: Partial<WorkspaceAppearance> | null | undefined,
  organizationName: string,
  logoUrl?: string | null,
  logoVersion?: string | number,
): WorkspaceAppearance & { logoSrc: string } {
  const preset =
    stored?.preset && listThemePresets().includes(stored.preset)
      ? stored.preset
      : "default";
  const presetColors =
    preset !== "custom" ? THEME_PRESETS[preset] : THEME_PRESETS.default;

  const logoSrc =
    logoUrl && logoVersion != null
      ? `${WORKSPACE_LOGO_API_PATH}?v=${logoVersion}`
      : "/images/sheetomatic-icon.svg";

  return {
    preset,
    primary: stored?.primary ?? presetColors.primary,
    sidebar: stored?.sidebar ?? presetColors.sidebar,
    sidebarHover: stored?.sidebarHover ?? presetColors.sidebarHover,
    background: stored?.background ?? presetColors.background,
    productName: stored?.productName?.trim() || "Sheetomatic",
    brandName: stored?.brandName?.trim() || organizationName,
    logoSrc,
  };
}

export function appearanceToCssVars(appearance: WorkspaceAppearance) {
  return `
    --ws-primary: ${appearance.primary};
    --ws-sidebar: ${appearance.sidebar};
    --ws-sidebar-hover: ${appearance.sidebarHover};
    --ws-page-bg: ${appearance.background};
  `;
}
