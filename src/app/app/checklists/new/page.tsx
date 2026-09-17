import { redirect } from "next/navigation";
import Link from "next/link";
import { ChecklistCreateForm } from "@/components/saas/checklist-create-form";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { canConfigureChecklists } from "@/lib/checklists/access";
import { getPcAiStarter } from "@/lib/checklists/ai-starters";
import { requireSession } from "@/lib/require-session";
import { listAssignableMembers } from "@/lib/tasks";

type PageProps = {
  searchParams: Promise<{ starter?: string }>;
};

export default async function NewChecklistPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "TASKS" });
  if (!canConfigureChecklists(user)) {
    redirect("/app/checklists");
  }

  const params = (await searchParams) ?? {};
  const starter = getPcAiStarter(
    typeof params.starter === "string" ? params.starter : undefined,
  );
  let members: Array<{ id: string; name: string | null; email: string }> = [];
  try {
    const assignable = await listAssignableMembers(user.organizationId);
    members = assignable.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
    }));
  } catch (error) {
    console.error("[checklists/new] members load failed", error);
  }

  return (
    <div className="saas-page ws-checklists-page ws-tasks-sf ws-pc-config-page">
      <div className="ws-fms-jf-page-bar">
        <Link href="/app/checklists/setup" className="ws-fms-jf-back">
          Back to setup
        </Link>
      </div>

      <TaskPageToolbar
        title="Configure checklist"
        description="Set schedule, team, and doer for a recurring PC item. Managers assign one-off work in Tasks (EA)."
      />

      <ChecklistCreateForm members={members} starterId={starter?.id ?? null} />
    </div>
  );
}
