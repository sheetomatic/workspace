import type { FmsPipelineCounts } from "@/lib/fms/pipeline-counts";

const items: Array<{
  key: keyof FmsPipelineCounts;
  label: string;
  tone: "neutral" | "ok" | "danger" | "pending";
}> = [
  { key: "active", label: "Active FMS", tone: "neutral" },
  { key: "onTrack", label: "On track", tone: "ok" },
  { key: "delayed", label: "Delayed", tone: "danger" },
  { key: "pending", label: "Pending", tone: "pending" },
];

export function FmsPipelineCountBadges({ counts }: { counts: FmsPipelineCounts }) {
  return (
    <div className="ws-fms-pipeline-count-badges">
      {items.map((item) => (
        <span
          key={item.key}
          className={`ws-fms-count-badge is-${item.tone}`}
          title={`${item.label}: ${counts[item.key]}`}
        >
          <strong>{counts[item.key]}</strong>
          <span className="ws-fms-count-badge-label">{item.label}</span>
        </span>
      ))}
    </div>
  );
}
