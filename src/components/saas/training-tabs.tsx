import Link from "next/link";
import { isLearnPortalRequest } from "@/lib/tenant-host";
import { learnPortalOrigin } from "@/lib/workspace-auth-links";

export type TrainingAdminBasePath =
  | "/app/leads/training"
  | "/app/my-space/training";

export async function TrainingTabs({
  current,
  basePath = "/app/leads/training",
  showLearnLink = true,
}: {
  current: "students" | "curriculum";
  basePath?: TrainingAdminBasePath;
  showLearnLink?: boolean;
}) {
  if (await isLearnPortalRequest()) {
    return null;
  }

  return (
    <nav className="training-tabs" aria-label="Training sections">
      <Link
        href={basePath}
        className={current === "students" ? "is-active" : ""}
      >
        Students
      </Link>
      <Link
        href={`${basePath}/content`}
        className={current === "curriculum" ? "is-active" : ""}
      >
        Teach
      </Link>
      {showLearnLink ? (
        <a href={`${learnPortalOrigin()}/app/leads/training`}>
          Open Learn portal
        </a>
      ) : null}
    </nav>
  );
}
