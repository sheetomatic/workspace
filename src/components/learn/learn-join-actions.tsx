import { studentClassPath } from "@/lib/learn/classroom";

export function LearnJoinActions({
  liveSlotId,
  groupMeetUrl,
  groupLabel,
  meetUrl,
  compact = false,
}: {
  liveSlotId?: string | null;
  groupMeetUrl?: string | null;
  groupLabel?: string | null;
  meetUrl?: string | null;
  compact?: boolean;
}) {
  const group = groupMeetUrl?.trim() || null;
  const oneToOne = meetUrl?.trim() && meetUrl.trim() !== group ? meetUrl.trim() : null;
  if (!liveSlotId && !group && !oneToOne) return null;

  return (
    <div className={`learn-join${compact ? " is-compact" : ""}`}>
      {liveSlotId ? (
        <a className="learn-btn-primary" href={studentClassPath(liveSlotId)}>
          Join class
        </a>
      ) : null}
      {group ? (
        <a
          className={liveSlotId ? "learn-btn-secondary" : "learn-btn-primary"}
          href={group}
          target="_blank"
          rel="noreferrer"
        >
          {groupLabel?.trim() ? `Join ${groupLabel.trim()}` : "Join group class"}
        </a>
      ) : null}
      {oneToOne ? (
        <a
          className={liveSlotId || group ? "learn-btn-secondary" : "learn-btn-primary"}
          href={oneToOne}
          target="_blank"
          rel="noreferrer"
        >
          Join Meet
        </a>
      ) : null}
    </div>
  );
}
