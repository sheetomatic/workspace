import Link from "next/link";
import type { HrSubModuleId } from "@/lib/hr/hr-sub-modules";

type HrNavLink = {
  href: string;
  label: string;
  adminOnly: boolean;
  /** Omit for Overview (always shown). */
  moduleId?: HrSubModuleId;
};

const links: HrNavLink[] = [
  { href: "/app/hr", label: "Overview", adminOnly: false },
  {
    href: "/app/hr/employees",
    label: "Employees",
    adminOnly: false,
    moduleId: "employees",
  },
  {
    href: "/app/hr/attendance",
    label: "Attendance",
    adminOnly: false,
    moduleId: "attendance",
  },
  {
    href: "/app/hr/leave",
    label: "Leave",
    adminOnly: false,
    moduleId: "leave",
  },
  {
    href: "/app/hr/holidays",
    label: "Holidays",
    adminOnly: true,
    moduleId: "holidays",
  },
  {
    href: "/app/hr/payroll",
    label: "Payroll",
    adminOnly: false,
    moduleId: "payroll",
  },
  {
    href: "/app/hr/field",
    label: "Field tracking",
    adminOnly: false,
    moduleId: "field",
  },
  {
    href: "/app/hr/hiring",
    label: "Hiring",
    adminOnly: false,
    moduleId: "hiring",
  },
];

export function HrSubNav({
  activePath,
  isAdmin = false,
  enabledSubModules,
}: {
  activePath: string;
  /** Holidays (and other admin-only links) show only when true. */
  isAdmin?: boolean;
  /** Resolved enabled ids from server. When omitted, show all (backward compat). */
  enabledSubModules?: string[];
}) {
  const enabledSet =
    enabledSubModules == null
      ? null
      : new Set(enabledSubModules);

  const visible = links.filter((link) => {
    if (link.adminOnly && !isAdmin) return false;
    if (!link.moduleId) return true;
    if (enabledSet == null) return true;
    return enabledSet.has(link.moduleId);
  });

  return (
    <nav className="ws-hr-subnav" aria-label="HR modules">
      {visible.map((link) => {
        const active =
          link.href === "/app/hr"
            ? activePath === "/app/hr"
            : activePath.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? "ws-hr-subnav-link active" : "ws-hr-subnav-link"}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
