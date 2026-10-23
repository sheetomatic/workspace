import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  FileSpreadsheet,
  Laptop,
  MessageCircle,
  PackageCheck,
  Play,
  Smartphone,
} from "lucide-react";
import {
  problemSolutionVisual,
  type ProblemSolutionCard,
  type ProblemSolutionCardId,
} from "@/app/page-content";
import { youtubeWatchUrl } from "@/app/video-content";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import { MarketingLinkButton } from "@/components/marketing/marketing-buttons";
import { ExecutionSnapshot } from "@/components/marketing/execution-snapshot";
import { BrandIconMark } from "@/components/brand/brand-icon-mark";
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

function RefinedOpsVisual({ card }: { card: ProblemSolutionCard }) {
  const isInventory = card.id === "ims";

  return (
    <div className={`ps-refined-visual ${isInventory ? "ps-refined-visual--inventory" : "ps-refined-visual--flow"}`} role="img" aria-label={card.imageAlt}>
      <div className="ps-refined-before">
        <div className="ps-refined-panel-heading">
          <span className="ps-refined-problem-icon"><CircleAlert size={15} aria-hidden /></span>
          <span>Before</span>
          <span className="ps-refined-state">Unstructured</span>
        </div>
        {isInventory ? (
          <div className="ps-paper-register">
            <div className="ps-paper-title"><span>Stock register</span><i /></div>
            <div className="ps-paper-row"><span>Bolt · A-01</span><b>120?</b></div>
            <div className="ps-paper-row"><span>Nut · A-01</span><b>200?</b></div>
            <div className="ps-paper-row"><span>Washer · B-02</span><b>75?</b></div>
            <div className="ps-paper-alert">Reorder? Which item?</div>
          </div>
        ) : (
          <div className="ps-chaos-stack">
            <div className="ps-chat-note"><MessageCircle size={15} aria-hidden /><span>Can you share the order update?</span><b>10:32</b></div>
            <div className="ps-chaos-sheet"><FileSpreadsheet size={18} aria-hidden /><strong>SALES_ORDERS.xlsx</strong><span>Owner? · Due? · Status?</span><div><i /><i /><i /></div></div>
            <div className="ps-chaos-followup"><BellRing size={14} aria-hidden /> Follow-up pending</div>
          </div>
        )}
        <p className="ps-refined-caption">Scattered updates. No clear next step.</p>
      </div>

      <div className="ps-refined-bridge" aria-hidden="true"><ArrowRight size={22} /></div>

      <div className="ps-refined-after">
        <div className="ps-refined-panel-heading">
          <span className="ps-refined-brand"><BrandIconMark size={22} /><strong>Sheetomatic</strong></span>
          <span className="ps-refined-state ps-refined-state--live">Live system</span>
        </div>
        {isInventory ? (
          <div className="ps-live-dashboard">
            <div className="ps-live-title"><div><small>INVENTORY OVERVIEW</small><strong>Stock at a glance</strong></div><span>Updated now</span></div>
            <div className="ps-inventory-table">
              <div className="ps-table-head"><span>Item</span><span>On hand</span><span>Status</span></div>
              <div className="ps-table-row"><span><i className="ps-item-dot ps-item-dot--blue" />Bolt · A-01</span><b>95</b><em className="ps-stock-ok"><CircleCheck size={12} aria-hidden /> Healthy</em></div>
              <div className="ps-table-row"><span><i className="ps-item-dot ps-item-dot--mint" />Nut · A-01</span><b>180</b><em className="ps-stock-ok"><CircleCheck size={12} aria-hidden /> Healthy</em></div>
              <div className="ps-table-row"><span><i className="ps-item-dot ps-item-dot--amber" />Washer · B-02</span><b>12</b><em className="ps-stock-low"><PackageCheck size={12} aria-hidden /> Reorder</em></div>
            </div>
            <div className="ps-live-footer"><span><PackageCheck size={14} aria-hidden /> Reorder point reached</span><b>Alert sent</b></div>
          </div>
        ) : (
          <div className="ps-live-dashboard">
            <div className="ps-live-title"><div><small>SALES ORDER · SO-1048</small><strong>One clear path to done</strong></div><span>Today</span></div>
            <div className="ps-flow-steps">
              <div className="ps-flow-step ps-flow-step--done"><i><CircleCheck size={13} aria-hidden /></i><span>Enquiry</span><b>Done</b></div>
              <div className="ps-flow-step ps-flow-step--done"><i><CircleCheck size={13} aria-hidden /></i><span>Dispatch</span><b>Done</b></div>
              <div className="ps-flow-step ps-flow-step--active"><i>03</i><span>Payment</span><b>Due today</b></div>
              <div className="ps-flow-step"><i>04</i><span>Close</span><b>Next</b></div>
            </div>
            <div className="ps-owner-task"><span className="ps-owner-avatar">RK</span><div><small>OWNER · RAHUL K.</small><strong>Confirm payment receipt</strong></div><span className="ps-task-due">2:00 PM</span></div>
            <div className="ps-live-footer"><span><BellRing size={14} aria-hidden /> Reminder scheduled</span><b>Owner notified</b></div>
          </div>
        )}
        <p className="ps-refined-caption ps-refined-caption--after">Clear owners. Live status. Nothing lost.</p>
      </div>
    </div>
  );
}

function VisualCard({ card }: { card: ProblemSolutionCard }) {
  const useRefinedVisual = card.id === "fms" || card.id === "ims";

  return (
    <article className="ps-visual-card">
      <div className="ps-visual-media">
        {useRefinedVisual ? (
          <RefinedOpsVisual card={card} />
        ) : (
          <Image
            src={card.imageSrc}
            alt={card.imageAlt}
            width={1200}
            height={800}
            sizes="(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 33vw"
            className="ps-visual-image"
          />
        )}
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

function WorkspaceDeviceShowcase() {
  return (
    <div className="ps-device-showcase" aria-label="Sheetomatic workspace on laptop and mobile">
      <div className="ps-device-copy">
        <p className="ps-device-kicker">
          <Laptop size={15} aria-hidden />
          <span>Desktop and mobile workspace</span>
          <Smartphone size={15} aria-hidden />
        </p>
        <p>One live view for owners, managers, and the team doing the work.</p>
      </div>

      <div className="ps-devices" aria-hidden>
        <div className="ps-laptop">
          <div className="ps-laptop-camera" />
          <div className="ps-laptop-screen">
            <div className="ps-laptop-toolbar">
              <BrandIconMark size={14} />
              <span>Sheetomatic</span>
              <i />
              <i />
              <i />
            </div>
            <div className="ps-laptop-workspace">
              <ExecutionSnapshot />
            </div>
          </div>
          <div className="ps-laptop-base" />
        </div>

        <div className="ps-phone">
          <div className="ps-phone-speaker" />
          <div className="ps-phone-screen">
            <div className="ps-phone-appbar">
              <span className="ps-phone-logo"><BrandIconMark size={13} /></span>
              <i />
              <i />
            </div>
            <p className="ps-phone-label">TODAY&apos;S FLOW</p>
            <strong>Sales order<br />processing</strong>
            <div className="ps-phone-progress"><i /></div>
            <div className="ps-phone-row ps-phone-row--done"><span />Order approved <b>Done</b></div>
            <div className="ps-phone-row ps-phone-row--active"><span />BOM review <b>Live</b></div>
            <div className="ps-phone-row"><span />Dispatch plan <b>Next</b></div>
            <div className="ps-phone-nav"><i /><i /><i /><i /></div>
          </div>
        </div>
      </div>
    </div>
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

      {!hideHead ? <WorkspaceDeviceShowcase /> : null}

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
