import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Play } from "lucide-react";
import { problemSolutionVisual } from "@/app/page-content";
import { youtubeWatchUrl } from "@/app/video-content";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import { MarketingLinkButton } from "@/components/marketing/marketing-buttons";
import "./problem-solution-visual.css";

type ProblemSolutionVisualProps = {
  /** Omit outer section chrome when nested in another section */
  embedded?: boolean;
};

function VisualBody() {
  const section = problemSolutionVisual;

  return (
    <>
      <div className="ps-visual-head">
        <p className="ps-visual-eyebrow">{section.eyebrow}</p>
        <h2 className="ps-visual-title" id="ps-visual-title">
          {section.title}
        </h2>
        <p className="ps-visual-lead">{section.lead}</p>
      </div>

      <div className="ps-visual-grid">
        {section.cards.map((card) => (
          <article className="ps-visual-card" key={card.id}>
            <div className="ps-visual-media">
              <Image
                src={card.imageSrc}
                alt={card.imageAlt}
                width={1200}
                height={800}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="ps-visual-image"
              />
            </div>

            <div className="ps-visual-copy">
              <p className="ps-visual-problem">
                <span className="ps-visual-tag">Problem</span>
                {card.problem}
              </p>
              <p className="ps-visual-solution">
                <span className="ps-visual-tag ps-visual-tag--solution">
                  Solution
                </span>
                <Link className="ps-visual-solution-link" href={card.exploreHref}>
                  {card.solution}
                </Link>
              </p>
            </div>

            <div className="ps-visual-actions">
              <a
                className="btn-cta btn-secondary ps-visual-btn"
                href={youtubeWatchUrl(card.youtubeId)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Play size={16} aria-hidden />
                <span>{card.youtubeLabel}</span>
                <ExternalLink size={14} aria-hidden />
              </a>
              <MarketingLinkButton
                className="ps-visual-btn"
                href={WORKSPACE_LOGIN_HREF}
                variant="primary"
              >
                <span>{card.workspaceLabel}</span>
              </MarketingLinkButton>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export function ProblemSolutionVisualSection({
  embedded = false,
}: ProblemSolutionVisualProps) {
  if (embedded) {
    return (
      <div className="ps-visual ps-visual--embedded">
        <VisualBody />
      </div>
    );
  }

  return (
    <section
      aria-labelledby="ps-visual-title"
      className="ps-visual section bg-white"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <VisualBody />
      </div>
    </section>
  );
}
