"use client";

import { CircleHelp, Lightbulb, ListOrdered } from "lucide-react";
import type { KnowledgeInstructionBlock } from "@/lib/ai-knowledge-instructions";

export function AiKnowledgeInstructionPanel({
  block,
  defaultOpen = true,
  compact = false,
}: {
  block: KnowledgeInstructionBlock;
  defaultOpen?: boolean;
  compact?: boolean;
}) {
  return (
    <details className="ai-knowledge-guide" open={defaultOpen}>
      <summary className="ai-knowledge-guide-summary">
        <CircleHelp size={16} aria-hidden />
        <span>{block.title}</span>
      </summary>
      <div className={`ai-knowledge-guide-body${compact ? " is-compact" : ""}`}>
        <p>{block.summary}</p>
        <div className="ai-knowledge-guide-section">
          <h3>
            <ListOrdered size={15} aria-hidden />
            How to use
          </h3>
          <ol>
            {block.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        {block.tips && block.tips.length > 0 ? (
          <div className="ai-knowledge-guide-section ai-knowledge-guide-tips">
            <h3>
              <Lightbulb size={15} aria-hidden />
              Tips
            </h3>
            <ul>
              {block.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  );
}
