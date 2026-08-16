import Link from "next/link";

export function TrainingTabs({
  current,
}: {
  current: "students" | "curriculum";
}) {
  return (
    <nav className="training-tabs" aria-label="Training sections">
      <Link
        href="/app/leads/training"
        className={current === "students" ? "is-active" : ""}
      >
        Students
      </Link>
      <Link
        href="/app/leads/training/content"
        className={current === "curriculum" ? "is-active" : ""}
      >
        Teach
      </Link>
    </nav>
  );
}
