import Link from "next/link";

const links = [
  { href: "/app/hr", label: "Overview" },
  { href: "/app/hr/employees", label: "Employees" },
  { href: "/app/hr/attendance", label: "Attendance" },
  { href: "/app/hr/leave", label: "Leave" },
  { href: "/app/hr/payroll", label: "Payroll" },
  { href: "/app/hr/field", label: "Field tracking" },
  { href: "/app/hr/hiring", label: "Hiring" },
];

export function HrSubNav({ activePath }: { activePath: string }) {
  return (
    <nav className="ws-hr-subnav" aria-label="HR modules">
      {links.map((link) => {
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
