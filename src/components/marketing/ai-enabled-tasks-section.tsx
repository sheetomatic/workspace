import { aiEnabledTasksVideo } from "@/app/video-content";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import { MarketingLinkButton } from "./marketing-buttons";
import { VideoEmbed } from "./video-embed";
import "./videos.css";

export function AiEnabledTasksSection() {
  return (
    <section
      aria-labelledby="ai-enabled-tasks-title"
      className="video-hero-strip soft-section"
      id="ai-enabled-tasks"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="video-hero-strip-inner">
          <div className="video-hero-strip-copy">
            <p className="video-hero-strip-kicker">WhatsApp → Tasks</p>
            <h2 id="ai-enabled-tasks-title">
              Assign from AI. Update from WhatsApp.
            </h2>
            <p>
              Conversations become owned tasks — employees update status in chat,
              data syncs to Sheets, and the owner reviews exceptions on EM.
            </p>
            <ul className="ai-tasks-feature-list">
              <li>Assign tasks with AI + WhatsApp automation</li>
              <li>Employees update work directly from WhatsApp</li>
              <li>Pending and delayed work visible for EM</li>
            </ul>
            <div className="minimal-hero-actions mt-6">
              <MarketingLinkButton href={WORKSPACE_LOGIN_HREF} variant="primary">
                Open Workspace
              </MarketingLinkButton>
              <MarketingLinkButton href="/courses" variant="secondary">
                Learn in Courses
              </MarketingLinkButton>
            </div>
          </div>
          <VideoEmbed video={aiEnabledTasksVideo} variant="featured" />
        </div>
      </div>
    </section>
  );
}
