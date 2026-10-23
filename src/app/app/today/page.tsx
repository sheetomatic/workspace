import { MyTodayBoard } from "@/components/saas/my-today-board";
import { getMyTodayPayload, EMPTY_TODAY_PAYLOAD } from "@/lib/work/my-today";
import { canCreateTasks } from "@/lib/tasks";
import { requireSession } from "@/lib/require-session";
import { canUseTasks, hasSuitePart } from "@/lib/workspace-access";

export default async function MyTodayPage() {
  const user = await requireSession();
  const hasTasks = canUseTasks(user);
  const hasFms = hasSuitePart(user, "fms");

  if (!hasTasks && !hasFms) {
    return (
      <div className="saas-page ws-today-page">
        <p>Enable Tasks or FMS add-ons to see your daily work queue.</p>
      </div>
    );
  }

  const payload = await getMyTodayPayload(user.organizationId, user.id, { tasks: hasTasks, fms: hasFms, checklists: hasSuitePart(user, "checklists") }).catch(
    (error) => {
      console.error("[today-page] load failed", error);
      return EMPTY_TODAY_PAYLOAD;
    },
  );

  return (
    <div className="saas-page ws-today-page ws-tasks-sf">
      <MyTodayBoard canDelegate={canCreateTasks(user.role)} payload={payload} />
    </div>
  );
}
