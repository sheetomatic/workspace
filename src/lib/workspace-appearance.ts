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
    primary: "#111113",
    sidebar: "#111113",
    sidebarHover: "#1c1c1f",
    background: "#eceef2",
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

const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTIONAL_COLOR = /^(?:rgb|rgba|hsl|hsla)\([0-9.,%\s/]+\)$/i;

/**
 * Only allow well-formed CSS color tokens. These values are interpolated into a
 * `<style>` block (appearanceToCssVars), so anything containing `}`, `<`, `;`,
 * quotes, etc. must be rejected to prevent stored XSS / style-block breakout.
 */
export function sanitizeCssColor(
  value: unknown,
  fallback: string,
): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (HEX_COLOR.test(trimmed) || FUNCTIONAL_COLOR.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export function listThemePresets(): ThemePreset[] {
  return ["default", "ocean", "forest", "sunset", "royal", "custom"];
}

export function getPresetLabel(preset: ThemePreset) {
  const labels: Record<ThemePreset, string> = {
    default: "Glide",
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
  const raw = value as Partial<WorkspaceAppearance>;
  const fallback = THEME_PRESETS.default;
  // Sanitize colors on read too, so any pre-existing/crafted stored value can
  // never break out of the <style> block when rendered.
  return {
    ...raw,
    ...(raw.primary !== undefined
      ? { primary: sanitizeCssColor(raw.primary, fallback.primary) }
      : {}),
    ...(raw.sidebar !== undefined
      ? { sidebar: sanitizeCssColor(raw.sidebar, fallback.sidebar) }
      : {}),
    ...(raw.sidebarHover !== undefined
      ? { sidebarHover: sanitizeCssColor(raw.sidebarHover, fallback.sidebarHover) }
      : {}),
    ...(raw.background !== undefined
      ? { background: sanitizeCssColor(raw.background, fallback.background) }
      : {}),
  };
}

export function mergeWorkspaceAppearance(
  stored: Partial<WorkspaceAppearance> | null | undefined,
  organizationName: string,
  logoUrl?: string | null,
  logoVersion?: string | number,
  options?: { dedicatedPortal?: boolean },
): WorkspaceAppearance & { logoSrc: string; lockupSrc: string; lockupLightSrc: string } {
  const preset =
    stored?.preset && listThemePresets().includes(stored.preset)
      ? stored.preset
      : "default";
  const presetColors =
    preset !== "custom" ? THEME_PRESETS[preset] : THEME_PRESETS.default;
  const useGlideDefault =
    preset === "default" &&
    (!stored?.primary ||
      stored.primary === "#2563eb" ||
      stored.primary === THEME_PRESETS.default.primary);

  const customLogo =
    logoUrl && logoVersion != null
      ? `${WORKSPACE_LOGO_API_PATH}?v=${logoVersion}`
      : null;

  const dedicated = options?.dedicatedPortal ?? false;
  const platformLogo = "/images/sheetomatic-icon.svg";
  const platformLockup = siteBrand.logoSrc;
  const platformLockupLight = "/images/sheetomatic-logo-light.svg";

  return {
    preset,
    primary: sanitizeCssColor(
      useGlideDefault ? presetColors.primary : stored?.primary,
      presetColors.primary,
    ),
    sidebar: sanitizeCssColor(
      useGlideDefault ? presetColors.sidebar : stored?.sidebar,
      presetColors.sidebar,
    ),
    sidebarHover: sanitizeCssColor(
      useGlideDefault ? presetColors.sidebarHover : stored?.sidebarHover,
      presetColors.sidebarHover,
    ),
    background: sanitizeCssColor(
      useGlideDefault ? presetColors.background : stored?.background,
      presetColors.background,
    ),
    productName: stored?.productName?.trim() || organizationName,
    brandName: stored?.brandName?.trim() || organizationName,
    logoSrc: customLogo ?? (dedicated ? "" : platformLogo),
    lockupSrc: customLogo ?? (dedicated ? "" : platformLockup),
    lockupLightSrc: customLogo ?? (dedicated ? "" : platformLockupLight),
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
