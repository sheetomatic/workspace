import type { PcWorkItem } from "@/lib/checklists/pc-work";

function titleCaseLabel(value: string) {
  return value
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function PcWorkKindBadge({ kind }: { kind: PcWorkItem["kind"] }) {
  const label =
    kind === "CHECKLIST" ? "PC" : kind === "EA_TASK" ? "EA" : "FMS";
  return (
    <span className={`ws-pc-kind-badge is-${kind.toLowerCase().replace("_", "-")}`}>
      {label}
    </span>
  );
}

export function PcStatusPill({
  status,
  overdue,
}: {
  status: string;
  overdue?: boolean;
}) {
  return (
    <span
      className={`ws-pc-status-pill${overdue ? " is-overdue" : status === "DONE" ? " is-done" : ""}`}
    >
      {overdue ? "Overdue" : titleCaseLabel(status)}
    </span>
  );
}
