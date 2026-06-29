"use client";

import Link from "next/link";
import { FMS_AI_STARTERS } from "@/lib/fms/ai-starters";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import { AiSetupHeroHead } from "@/components/saas/ai-setup-hero-head";

export function FmsAiSetupPanel() {
  const featured = FMS_AI_STARTERS.slice(0, 6);

  return (
    <section
      className="ws-sf-card ws-fms-ai-setup-hero ws-fms-ai-setup-panel"
      aria-label="AI FMS builder"
    >
      <AiSetupHeroHead
        title="Build FMS with AI"
        description="One main tracker plus stage-wise forms. Describe your process or pick a department starter - AI designs the flow, form fields, TAT, and alerts."
        action={
          <Link href="/app/fms/design/new" className="btn-cta btn-primary ws-sf-btn-primary">
            <SheetomaticAiMark variant="icon" sizes="sm" className="ws-fms-ai-btn-mark" />
            New AI workflow
          </Link>
        }
      />
      <ul className="ws-fms-ai-starter-grid is-compact">
        {featured.map((starter) => (
          <li key={starter.id}>
            <Link
              href={
                starter.templateId
                  ? `/app/fms/design/new?template=${starter.templateId}`
                  : `/app/fms/design/new?starter=${starter.id}`
              }
              className="ws-fms-ai-starter-card"
            >
              <strong>{starter.label}</strong>
              <span>{starter.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
