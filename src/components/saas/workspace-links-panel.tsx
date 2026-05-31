import type { WorkspaceLink } from "@prisma/client";
import { ExternalLink } from "lucide-react";
import { WORKSPACE_LINK_LABELS } from "@/lib/workspace";

export function WorkspaceLinksPanel({ links }: { links: WorkspaceLink[] }) {
  if (links.length === 0) {
    return (
      <div className="saas-note-banner">
        <p>
          No connected systems yet. Your Sheetomatic team will link Sheets,
          dashboards, and AppSheet apps here during onboarding.
        </p>
      </div>
    );
  }

  return (
    <ul className="saas-links-list">
      {links.map((link) => (
        <li key={link.id}>
          <div className="saas-link-meta">
            <span className="saas-link-type">
              {WORKSPACE_LINK_LABELS[link.type]}
            </span>
            <strong>{link.label}</strong>
          </div>
          <a
            className="saas-link-open"
            href={link.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open
            <ExternalLink size={14} aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}
