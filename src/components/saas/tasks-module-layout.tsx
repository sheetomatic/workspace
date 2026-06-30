"use client";

import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { TasksModuleNav } from "@/components/saas/tasks-module-nav";

function shouldHideTasksSubnav(pathname: string) {
  return pathname === "/app/tasks/create" || pathname.startsWith("/app/tasks/create/");
}

export function TasksModuleLayout({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideSubnav = shouldHideTasksSubnav(pathname);

  return (
    <div
      className={`ws-module-layout ws-tasks-module-layout${hideSubnav ? " ws-module-layout--no-subnav" : ""}`}
    >
      {!hideSubnav ? <TasksModuleNav user={user} /> : null}
      <div className="ws-module-layout-main">{children}</div>
    </div>
  );
}
