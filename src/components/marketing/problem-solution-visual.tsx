import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Play } from "lucide-react";
import {
  problemSolutionVisual,
  type ProblemSolutionCard,
  type ProblemSolutionCardId,
} from "@/app/page-content";
import { youtubeWatchUrl } from "@/app/video-content";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import { MarketingLinkButton } from "@/components/marketing/marketing-buttons";
import "./problem-solution-visual.css";

type ProblemSolutionVisualProps = {
  /** Omit outer section chrome when nested in another section */
  embedded?: boolean;
  /** Filter/order cards by id. Defaults to full catalog. */
  cardIds?: readonly ProblemSolutionCardId[];
  /** Override section eyebrow */
  eyebrow?: string;
  /** Override section title */
  title?: string;
  /** Override section lead */
  lead?: string;
  /** Hide section head (useful for single-card embeds) */
  hideHead?: boolean;
};

function resolveCards(
  cardIds?: readonly ProblemSolutionCardId[],
): ProblemSolutionCard[] {
  const catalog = problemSolutionVisual.cards as readonly ProblemSolutionCard[];
  if (!cardIds?.length) return [...catalog];
  const byId = new Map(catalog.map((card) => [card.id, card]));
  return cardIds
    .map((id) => byId.get(id))
    .filter((card): card is ProblemSolutionCard => Boolean(card));
}

function VisualCard({ card }: { card: ProblemSolutionCard }) {
  return (
    <article className="ps-visual-card">
      <div className="ps-visual-media">
        <Image
          src={card.imageSrc}
          alt={card.imageAlt}
          width={1200}
          height={800}
          sizes="(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 33vw"
          className="ps-visual-image"
        />
      </div>

      <div className="ps-visual-copy">
        <p className="ps-visual-problem">
          <span className="ps-visual-tag">Problem</span>
          {card.problem}
        </p>
        <p className="ps-visual-solution">
          <span className="ps-visual-tag ps-visual-tag--solution">Solution</span>
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
  );
}

function VisualBody({
  cards,
  eyebrow,
  title,
  lead,
  hideHead,
}: {
  cards: ProblemSolutionCard[];
  eyebrow: string;
  title: string;
  lead: string;
  hideHead?: boolean;
}) {
  const gridClass =
    cards.length === 1
      ? "ps-visual-grid ps-visual-grid--single"
      : cards.length >= 5
        ? "ps-visual-grid ps-visual-grid--dense"
        : "ps-visual-grid";

  return (
    <>
      {!hideHead ? (
        <div className="ps-visual-head">
          <p className="ps-visual-eyebrow">{eyebrow}</p>
          <h2 className="ps-visual-title" id="ps-visual-title">
            {title}
          </h2>
          <p className="ps-visual-lead">{lead}</p>
        </div>
      ) : null}

      <div className={gridClass}>
        {cards.map((card) => (
          <VisualCard card={card} key={card.id} />
        ))}
      </div>
    </>
  );
}

export function ProblemSolutionVisualSection({
  embedded = false,
  cardIds,
  eyebrow,
  title,
  lead,
  hideHead = false,
}: ProblemSolutionVisualProps) {
  const section = problemSolutionVisual;
  const cards = resolveCards(cardIds);
  if (cards.length === 0) return null;

  const body = (
    <VisualBody
      cards={cards}
      eyebrow={eyebrow ?? section.eyebrow}
      title={title ?? section.title}
      lead={lead ?? section.lead}
      hideHead={hideHead}
    />
  );

  if (embedded) {
    return <div className="ps-visual ps-visual--embedded">{body}</div>;
  }

  return (
    <section
      aria-labelledby={hideHead ? undefined : "ps-visual-title"}
      className="ps-visual section bg-white"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">{body}</div>
    </section>
  );
}
