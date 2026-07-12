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
            <p className="video-hero-strip-kicker">Tasks / EA</p>
            <h2 id="ai-enabled-tasks-title">
              Delegate work. See pending as deficit — not chatter.
            </h2>
            <p>
              Task delegation with clear owners and status. Train the EA habit
              in Courses, then run it in Sheetomatic Workspace with WhatsApp
              alerts for staff.
            </p>
            <ul className="ai-tasks-feature-list">
              <li>Owners, due dates, and status in one system</li>
              <li>Pending and delayed work visible for EM</li>
              <li>WhatsApp nudges for staff — owner reviews exceptions</li>
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
