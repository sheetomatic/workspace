export interface ThemePalette {
  id: string;
  name: string;
  ink: string;
  accent: string;
  paper: string;
  soft: string;
  muted: string;
  line: string;
  onAccent: string;
}

export const THEMES: ThemePalette[] = [
  {
    id: "ink",
    name: "Ink",
    ink: "#111113",
    accent: "#111113",
    paper: "#ffffff",
    soft: "#f4f5f7",
    muted: "#6b7280",
    line: "#e6e7eb",
    onAccent: "#ffffff",
  },
  {
    id: "navy",
    name: "Navy",
    ink: "#10233f",
    accent: "#163a7a",
    paper: "#ffffff",
    soft: "#e8eef6",
    muted: "#5a6b82",
    line: "#d5dee9",
    onAccent: "#ffffff",
  },
  {
    id: "saffron",
    name: "Saffron",
    ink: "#3f2a0c",
    accent: "#c2410c",
    paper: "#fffdf8",
    soft: "#fff4e5",
    muted: "#8a6a3d",
    line: "#f0e0c4",
    onAccent: "#ffffff",
  },
  {
    id: "forest",
    name: "Forest",
    ink: "#14532d",
    accent: "#15803d",
    paper: "#ffffff",
    soft: "#ecfdf3",
    muted: "#4d7c5a",
    line: "#cce7d4",
    onAccent: "#ffffff",
  },
  {
    id: "steel",
    name: "Steel",
    ink: "#334155",
    accent: "#475569",
    paper: "#f8fafc",
    soft: "#e2e8f0",
    muted: "#64748b",
    line: "#cbd5e1",
    onAccent: "#ffffff",
  },
  {
    id: "teal",
    name: "Teal",
    ink: "#134e4a",
    accent: "#0f766e",
    paper: "#ffffff",
    soft: "#ccfbf1",
    muted: "#4b7c76",
    line: "#99f6e4",
    onAccent: "#ffffff",
  },
  {
    id: "rose",
    name: "Rose",
    ink: "#4c0519",
    accent: "#be123c",
    paper: "#fff7f8",
    soft: "#ffe4e6",
    muted: "#9f1239",
    line: "#fecdd3",
    onAccent: "#ffffff",
  },
  {
    id: "night",
    name: "Night",
    ink: "#f4f4f5",
    accent: "#a1a1aa",
    paper: "#18181b",
    soft: "#27272a",
    muted: "#a1a1aa",
    line: "#3f3f46",
    onAccent: "#18181b",
  },
];

export function themeById(id?: string): ThemePalette {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function themeVars(theme: ThemePalette, accentOverride?: string) {
  const accent = accentOverride || theme.accent;
  return {
    ["--ink" as string]: theme.ink,
    ["--accent" as string]: accent,
    ["--paper" as string]: theme.paper,
    ["--soft" as string]: theme.soft,
    ["--muted" as string]: theme.muted,
    ["--line" as string]: theme.line,
    ["--on-accent" as string]: theme.onAccent,
    color: theme.ink,
    background: theme.paper,
  };
}
