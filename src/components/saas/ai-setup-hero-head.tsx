import type { ReactNode } from "react";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";

export function AiSetupHeroHead({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="ws-fms-ai-setup-hero-head">
      <div className="ws-fms-ai-setup-hero-mark" aria-hidden>
        <SheetomaticAiMark variant="icon" sizes="lg" />
      </div>
      <div className="ws-fms-ai-setup-hero-copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="ws-fms-ai-setup-hero-action">{action}</div>
    </div>
  );
}
