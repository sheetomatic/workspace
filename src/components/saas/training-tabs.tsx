import Link from "next/link";
import { isLearnPortalRequest } from "@/lib/tenant-host";
import { learnPortalOrigin } from "@/lib/workspace-auth-links";

export async function TrainingTabs({
  current,
}: {
  current: "students" | "curriculum";
}) {
  if (await isLearnPortalRequest()) {
    return null;
  }

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
      <a href={`${learnPortalOrigin()}/app/leads/training`}>
        Open Learn portal
      </a>
    </nav>
  );
}
