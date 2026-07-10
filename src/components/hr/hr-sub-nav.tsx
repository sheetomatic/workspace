import Link from "next/link";

const links = [
  { href: "/app/hr", label: "Overview", adminOnly: false },
  { href: "/app/hr/employees", label: "Employees", adminOnly: false },
  { href: "/app/hr/attendance", label: "Attendance", adminOnly: false },
  { href: "/app/hr/leave", label: "Leave", adminOnly: false },
  { href: "/app/hr/holidays", label: "Holidays", adminOnly: true },
  { href: "/app/hr/payroll", label: "Payroll", adminOnly: false },
  { href: "/app/hr/field", label: "Field tracking", adminOnly: false },
  { href: "/app/hr/hiring", label: "Hiring", adminOnly: false },
];

export function HrSubNav({
  activePath,
  isAdmin = false,
}: {
  activePath: string;
  /** Holidays (and other admin-only links) show only when true. */
  isAdmin?: boolean;
}) {
  const visible = links.filter((link) => !link.adminOnly || isAdmin);

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
