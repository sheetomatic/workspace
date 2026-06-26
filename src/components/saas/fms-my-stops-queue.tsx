import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { fmsInstanceHref } from "@/lib/fms/navigation";

export type FmsMyStopQueueItem = {
  instanceId: string;
  leadLabel: string;
  stepName: string;
  plannedAt: string | null;
  isOverdue: boolean;
  delayLabel: string | null;
};

function formatDue(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function FmsMyStopsQueue({
  items,
  templateId,
}: {
  items: FmsMyStopQueueItem[];
  templateId: string;
}) {
  if (items.length === 0) {
    return (
      <div className="ws-empty-state ws-fms-empty-state ws-fms-my-stops-queue-mobile">
        <p>No active stops assigned to you in this workflow.</p>
      </div>
    );
  }

  return (
    <div className="ws-fms-my-stops-queue-mobile ws-fms-my-stop-wrap is-my-turn">
      <p className="ws-fms-my-turn-banner">Tap a stop to complete it</p>
      <ul className="ws-fms-my-stop-list">
        {items.map((item) => (
          <li key={item.instanceId}>
            <Link
              href={fmsInstanceHref(
                item.instanceId,
                "my-stops",
                templateId,
                "complete",
              )}
              className="ws-fms-my-stop-link"
            >
              <strong>{item.leadLabel}</strong>
              <span>{item.stepName}</span>
              <span className="ws-fms-muted">
                {item.isOverdue && item.delayLabel
                  ? `Delayed ${item.delayLabel}`
                  : item.plannedAt
                    ? `Due ${formatDue(item.plannedAt)}`
                    : "In progress"}
              </span>
              <ChevronRight size={18} aria-hidden className="ws-fms-my-stop-chevron" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
