import Link from "next/link";
import { Bot, Briefcase, Users } from "lucide-react";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import type { SessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { aiPortalOrigin } from "@/lib/workspace-auth-links";

export function ModuleSettingsLinks({ user }: { user: SessionUser }) {
  const links: Array<{
    key: string;
    href: string;
    label: string;
    description: string;
    icon: typeof Briefcase;
    external?: boolean;
  }> = [];

  if (hasWorkspaceModule(user, "CASES") && isLegalAdmin(user)) {
    links.push({
      key: "cases",
      href: "/app/cases/settings",
      label: "Cases workbook",
      description: "Import/export CSV or Excel, restore backups, edit case rows.",
      icon: Briefcase,
    });
  }

  if (hasMinimumRole(user.role, "ADMIN")) {
    links.push({
      key: "team",
      href: "/app/team",
      label: "Team & access",
      description: "Members, roles, modules, staff codes, and HR defaults.",
      icon: Users,
    });
  }

  if (hasMinimumRole(user.role, "ADMIN")) {
    links.push({
      key: "ai",
      href: `${aiPortalOrigin()}/ai/app/settings`,
      label: "WhatsApp & AI",
      description: "Number connection, knowledge base, reply limits, and go-live.",
      icon: Bot,
      external: true,
    });
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <article className="saas-panel saas-module-settings-links">
      <div className="saas-module-settings-head">
        <h3>Module settings</h3>
        <p className="saas-panel-lead">
          Organization-level tools live with each product module, not under personal
          account settings. This keeps tenant data and permissions scoped correctly.
        </p>
      </div>
      <ul className="saas-module-settings-list">
        {links.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <span className="saas-module-settings-icon">
                <Icon aria-hidden size={18} strokeWidth={2} />
              </span>
              <span className="saas-module-settings-copy">
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </span>
            </>
          );

          return (
            <li key={item.key}>
              {item.external ? (
                <a
                  className="saas-module-settings-link"
                  href={item.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {content}
                </a>
              ) : (
                <Link className="saas-module-settings-link" href={item.href}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
