import Link from "next/link";
import { studentLearnLogoutAction } from "@/app/learn/actions";

export function LearnNav({
  name,
  current,
}: {
  name: string;
  current: "home" | "courses" | "schedule";
}) {
  return (
    <header className="learn-nav">
      <div className="learn-nav-brand">
        <Link href="/learn">Student panel</Link>
        <span>{name}</span>
      </div>
      <nav>
        <Link href="/learn" className={current === "home" ? "is-active" : ""}>
          Home
        </Link>
        <Link
          href="/learn/courses"
          className={current === "courses" ? "is-active" : ""}
        >
          Courses
        </Link>
        <Link
          href="/learn/schedule"
          className={current === "schedule" ? "is-active" : ""}
        >
          Schedule
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
