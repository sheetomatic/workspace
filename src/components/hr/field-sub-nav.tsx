import Link from "next/link";

const links = [
  { href: "/app/field", label: "Field board" },
  { href: "/app/field/conveyance", label: "Conveyance" },
] as const;

export function FieldSubNav({ activePath }: { activePath: string }) {
  return (
    <nav className="ws-hr-subnav" aria-label="Field tracking">
      {links.map((link) => {
        const active =
          link.href === "/app/field"
            ? activePath === "/app/field" || activePath === "/app/field/"
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
