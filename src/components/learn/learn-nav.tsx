import Link from "next/link";
import { studentLearnLogoutAction } from "@/app/learn/actions";

const LINKS = [
  { href: "/learn", id: "home", label: "Status" },
  { href: "/learn/schedule", id: "schedule", label: "Schedule" },
  { href: "/learn/courses", id: "learn", label: "Learn" },
  { href: "/learn/contents", id: "contents", label: "Class files" },
] as const;

export function LearnNav({
  name,
  current,
}: {
  name: string;
  current: "home" | "schedule" | "learn" | "contents";
}) {
  const initial = (name.trim()[0] || "?").toUpperCase();

  return (
    <header className="learn-nav">
      <div className="learn-nav-brand">
        <Link href="/learn" className="learn-nav-mark" aria-label="Sheetomatic Learn home">
          <span aria-hidden>S</span>
        </Link>
        <div>
          <Link href="/learn">Sheetomatic Learn</Link>
          <span>{name}</span>
        </div>
      </div>
      <nav aria-label="Student">
        {LINKS.map((link) => (
          <Link
            key={link.id}
            href={link.href}
            className={current === link.id ? "is-active" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="learn-nav-user">
        <span className="learn-nav-avatar" aria-hidden>
          {initial}
        </span>
        <form action={studentLearnLogoutAction}>
          <button type="submit" className="learn-link-btn">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
