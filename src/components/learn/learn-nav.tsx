import Link from "next/link";
import { studentLearnLogoutAction } from "@/app/learn/actions";

export function LearnNav({
  name,
  current,
}: {
  name: string;
  current: "home" | "schedule" | "contents";
}) {
  return (
    <header className="learn-nav">
      <div className="learn-nav-brand">
        <Link href="/learn">Student panel</Link>
        <span>{name}</span>
      </div>
      <nav>
        <Link href="/learn" className={current === "home" ? "is-active" : ""}>
          Status
        </Link>
        <Link
          href="/learn/schedule"
          className={current === "schedule" ? "is-active" : ""}
        >
          Schedule
        </Link>
        <Link
          href="/learn/contents"
          className={current === "contents" ? "is-active" : ""}
        >
          Contents
        </Link>
      </nav>
      <form action={studentLearnLogoutAction}>
        <button type="submit" className="learn-link-btn">
          Sign out
        </button>
      </form>
    </header>
  );
}
