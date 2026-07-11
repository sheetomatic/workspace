import type { LeadTemperature } from "@prisma/client";

const TEMP_LABELS: Record<LeadTemperature, string> = {
  HOT: "Hot",
  WARM: "Warm",
  COLD: "Cold",
};

export function LeadTemperatureBadge({
  temperature,
  score,
  compact = false,
}: {
  temperature: LeadTemperature | null | undefined;
  score?: number | null;
  compact?: boolean;
}) {
  if (!temperature && (score == null || !Number.isFinite(score))) {
    return null;
  }

  const temp = temperature ?? null;
  const scoreLabel =
    score != null && Number.isFinite(score) ? String(Math.round(score)) : null;

  return (
    <span
      className={`leads-temp-badge${temp ? ` is-${temp.toLowerCase()}` : ""}${compact ? " is-compact" : ""}`}
      title={
        temp && scoreLabel
          ? `${TEMP_LABELS[temp]} · score ${scoreLabel}`
          : temp
            ? TEMP_LABELS[temp]
            : scoreLabel
              ? `Score ${scoreLabel}`
              : undefined
      }
    >
      {temp ? <span className="leads-temp-label">{TEMP_LABELS[temp]}</span> : null}
      {scoreLabel ? <span className="leads-temp-score">{scoreLabel}</span> : null}
    </span>
  );
}
