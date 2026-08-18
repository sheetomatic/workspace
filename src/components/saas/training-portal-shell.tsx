"use client";

import "@/components/saas/training-students-panel.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "next-auth/react";
import {
  LEARN_ADMIN_HOME,
  workspacePortalOrigin,
} from "@/lib/workspace-auth-links";
import { isLearnAdminPath } from "@/lib/subdomain";

export function TrainingPortalShell({
  children,
  organizationName,
  userName,
}: {
  children: React.ReactNode;
  organizationName: string;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const onTeach = pathname.startsWith("/app/leads/training/content");

  useEffect(() => {
    if (!isLearnAdminPath(pathname)) {
      router.replace(LEARN_ADMIN_HOME);
    }
  }, [pathname, router]);

  return (
    <div className="learn-admin-shell workspace-app">
      <header className="learn-admin-bar">
        <div className="learn-admin-brand">
          <strong>Sheetomatic Learn</strong>
          <span>{organizationName}</span>
        </div>
        <nav aria-label="Learn admin">
          <Link
            href="/app/leads/training"
            className={!onTeach ? "is-active" : undefined}
          >
            Students
          </Link>
          <Link
            href="/app/leads/training/content"
            className={onTeach ? "is-active" : undefined}
          >
            Teach
          </Link>
        </nav>
        <div className="learn-admin-user">
          <span>{userName}</span>
          <a href={`${workspacePortalOrigin()}/app`}>Open workspace</a>
          <button
            type="button"
            onClick={() =>
              void signOut({ callbackUrl: "/login?product=learn" })
            }
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="learn-admin-main" id="main">
        {children}
      </div>
    </div>
  );
}
