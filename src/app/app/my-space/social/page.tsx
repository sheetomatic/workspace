import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { SocialScheduleBoard } from "@/components/my-space/social-schedule-board";
import { requireSession } from "@/lib/require-session";
import { isPrimaryOrganization } from "@/lib/platform";
import { getSocialSchedule } from "@/lib/my-space/social/schedule";

export default async function MySpaceSocialSchedulePage() {
  const user = await requireSession("MANAGER");
  const primary = await isPrimaryOrganization(user.organizationId);
  const allowed = user.isSuperAdmin || primary;

  if (!allowed) {
    return (
      <div className="saas-page ws-ims-sf">
        <div className="ws-ims-page">
          <TaskPageToolbar
            title="Social schedule"
            description="LinkedIn content calendar is available on the primary Sheetomatic workspace."
            actions={
              <Link href="/app/my-space" className="ws-btn ws-btn-secondary">
                Back to My Space
              </Link>
            }
          />
          <section className="ws-ims-panel">
            <p className="ws-apple-record-empty">
              Switch to the primary Sheetomatic organization to review and approve posts.
            </p>
          </section>
        </div>
      </div>
    );
  }

  const schedule = await getSocialSchedule(user.organizationId);

  return (
    <div className="saas-page ws-ims-sf">
      <div className="ws-ims-page">
        <TaskPageToolbar
          title="Social schedule"
          description={`${schedule.weekLabel} · @${schedule.account} · ICP only (no grocery/general store) · long Hinglish stories, hook on line 1 · Mon–Fri image · Sat–Sun carousel no caption · 8/11/4/9 IST`}
          actions={
            <Link href="/app/my-space" className="ws-btn ws-btn-secondary">
              Back to My Space
            </Link>
          }
        />

        <section className="ws-ims-panel">
          <div className="ws-ims-panel-head">
            <h2>Weekly approval board</h2>
          </div>
          <SocialScheduleBoard schedule={schedule} />
        </section>
      </div>
    </div>
  );
}
