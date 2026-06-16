import type { MisScoreResult } from "@/lib/mis/score";

const tierClass: Record<MisScoreResult["tier"], string> = {
  excellent: "is-excellent",
  good: "is-good",
  fair: "is-fair",
  poor: "is-poor",
};

export function MisScoreBadge({
  score,
  compact = false,
  showLabel = true,
}: {
  score: MisScoreResult;
  compact?: boolean;
  showLabel?: boolean;
}) {
  return (
    <span
      className={`ws-mis-score ${tierClass[score.tier]}${compact ? " is-compact" : ""}`}
      title={`MIS score: ${score.score} (${score.label})`}
    >
      <strong>{score.score}</strong>
      {showLabel && !compact ? (
        <span className="ws-mis-score-label">{score.label}</span>
      ) : null}
    </span>
  );
}
