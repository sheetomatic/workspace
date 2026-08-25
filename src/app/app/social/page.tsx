import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { SocialScheduleBoard } from "@/components/my-space/social-schedule-board";
import { SocialStudioPanel } from "@/components/social/social-studio-panel";
import { requireSession } from "@/lib/require-session";
import { getSocialSchedule } from "@/lib/my-space/social/schedule";
import { SOCIAL_SLOT_LABELS } from "@/lib/my-space/social/types";
import "@/components/saas/client-billing.css";

export default async function SocialModulePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await requireSession("STAFF", { module: "SOCIAL" });
  const params = searchParams ? await searchParams : {};
  const tab =
    params.tab === "posted" ? "posted" : params.tab === "create" ? "create" : "week";
  const schedule = await getSocialSchedule(user.organizationId);
  const posted = schedule.posts.filter((post) => post.status === "posted");

  return (
    <div className="saas-page ws-ims-sf">
      <div className="ws-ims-page">
        <TaskPageToolbar
          title="Social"
          description="Write captions, generate image or carousel, then post by hand and mark Posted. Grant the Social module on Team to give access."
          actions={
            <nav className="ws-billing-actions">
              <Link className={tab === "week" ? "btn-cta" : "btn-secondary"} href="/app/social">
                This week
              </Link>
              <Link
                className={tab === "create" ? "btn-cta" : "btn-secondary"}
                href="/app/social?tab=create"
              >
                Create
              </Link>
              <Link
                className={tab === "posted" ? "btn-cta" : "btn-secondary"}
                href="/app/social?tab=posted"
              >
                Posted
              </Link>
            </nav>
          }
        />

        {tab === "create" ? (
          <section className="ws-ims-panel">
            <SocialStudioPanel />
          </section>
        ) : null}

        {tab === "posted" ? (
          <section className="ws-ims-panel">
            <div className="ws-ims-panel-head">
              <h2>Posted on social</h2>
            </div>
            {posted.length === 0 ? (
              <p>Nothing marked posted yet. After someone publishes, open the week card and tap Posted.</p>
            ) : (
              <div className="ws-billing-table-wrap">
                <table className="ws-billing-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Post</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posted.map((post) => (
                      <tr key={post.id}>
                        <td>
                          {post.day} {post.date} · {SOCIAL_SLOT_LABELS[post.time] ?? post.time}
                          <div>
                            {post.postedAt
                              ? new Date(post.postedAt).toLocaleString("en-IN")
                              : ""}
                          </div>
                        </td>
                        <td>
                          <strong>{post.title}</strong>
                          <div>
                            {post.format === "carousel" ? "Carousel" : "Image"}
                            {post.icp ? ` · ${post.icp}` : ""}
                          </div>
                        </td>
                        <td>{post.postedByName || post.createdByName || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {tab === "week" ? (
          <section className="ws-ims-panel">
            <div className="ws-ims-panel-head">
              <h2>
                {schedule.weekLabel} · @{schedule.account}
              </h2>
            </div>
            <SocialScheduleBoard schedule={schedule} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
