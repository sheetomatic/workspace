import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { VideoStudioPanel } from "@/components/video/video-studio-panel";
import { requireSession } from "@/lib/require-session";
import { listVideoJobs } from "@/lib/video/jobs";
import { isT2vConfigured } from "@/lib/video/provider";
import "@/components/saas/client-billing.css";

export default async function VideoPage() {
  const user = await requireSession("STAFF");
  const [jobs, configured] = await Promise.all([
    listVideoJobs(user.organizationId),
    Promise.resolve(isT2vConfigured()),
  ]);

  return (
    <div className="saas-page ws-ims-sf">
      <div className="ws-ims-page">
        <TaskPageToolbar
          title="Video"
          description="Type a prompt, get a video. Any subject. Maximum length 10 minutes."
        />
        <section className="ws-ims-panel">
          <VideoStudioPanel configured={configured} initialJobs={jobs} />
        </section>
      </div>
    </div>
  );
}
