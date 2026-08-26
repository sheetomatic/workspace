import type { ReactNode } from "react";

export type StudioSection = "app" | "data" | "automate" | "people";

const LINKS: { id: StudioSection; label: string }[] = [
  { id: "app", label: "App" },
  { id: "data", label: "Data" },
  { id: "automate", label: "Automate" },
  { id: "people", label: "People" },
];

export function editorToSection(
  editor: "layout" | "data" | "bots" | "intelligence" | "users" | "settings",
): StudioSection {
  if (editor === "data") return "data";
  if (editor === "bots" || editor === "intelligence") return "automate";
  if (editor === "users" || editor === "settings") return "people";
  return "app";
}

export function StudioChrome({
  appName,
  section,
  onSection,
  sheetOpen,
  onToggleSheet,
  preview,
  onTogglePreview,
  onTemplates,
  sheetLabel,
  sheetPanel,
  subbar,
}: {
  appName: string;
  section: StudioSection;
  onSection: (section: StudioSection) => void;
  sheetOpen: boolean;
  onToggleSheet: () => void;
  preview: boolean;
  onTogglePreview: () => void;
  onTemplates: () => void;
  sheetLabel: string;
  sheetPanel?: ReactNode;
  subbar?: ReactNode;
}) {
  return (
    <>
      <header className="ab-nav">
        <button
          type="button"
          className="ab-nav-brand"
          onClick={() => onSection("app")}
        >
          <i>S</i>
          <strong>{appName}</strong>
        </button>
        <nav className="ab-nav-links" aria-label="Studio">
          {LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              className={section === link.id ? "on" : ""}
              onClick={() => onSection(link.id)}
            >
              {link.label}
            </button>
          ))}
        </nav>
        <div className="ab-nav-tools">
          <button type="button" onClick={onTemplates}>
            Templates
          </button>
          <button
            type="button"
            className={sheetOpen ? "on" : ""}
            onClick={onToggleSheet}
          >
            {sheetLabel}
          </button>
          <button
            type="button"
            className={preview ? "on" : ""}
            onClick={onTogglePreview}
          >
            {preview ? "Done" : "Preview"}
          </button>
        </div>
      </header>
      {sheetPanel}
      {subbar}
    </>
  );
}
