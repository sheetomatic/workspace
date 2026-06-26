export type PcWorkKind = "CHECKLIST" | "EA_TASK" | "FMS_STEP";

export type PcWorkItem = {
  id: string;
  kind: PcWorkKind;
  title: string;
  subtitle: string;
  owner: string;
  dueLabel: string;
  status: string;
  overdue: boolean;
  href: string;
  /** Checklist occurrences can be marked done on the PC board. */
  completable: boolean;
};
