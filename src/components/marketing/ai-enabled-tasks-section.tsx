import { aiEnabledTasksVideo } from "@/app/video-content";
import { AI_START_FREE_HREF } from "@/lib/ai-auth-links";
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
            <p className="video-hero-strip-kicker">AI Enabled Tasks</p>
            <h2 id="ai-enabled-tasks-title">
              Delegate work from WhatsApp. Instantly.
            </h2>
            <p>
              Send a voice note or text message. Sheetomatic creates the task,
              assigns the owner, sets the due date, and notifies your team on
              WhatsApp, with a web task board for managers.
            </p>
            <ul className="ai-tasks-feature-list">
              <li>Voice and text capture on WhatsApp</li>
              <li>Automatic assignee alerts</li>
              <li>Manager task board in Workspace</li>
            </ul>
            <div className="minimal-hero-actions mt-6">
              <MarketingLinkButton href="/login" variant="primary">
                Open Workspace
              </MarketingLinkButton>
              <MarketingLinkButton href={AI_START_FREE_HREF} variant="secondary">
                Start with Sheetomatic AI
              </MarketingLinkButton>
            </div>
          </div>
          <VideoEmbed video={aiEnabledTasksVideo} variant="featured" />
        </div>
      </div>
    </section>
  );
}
