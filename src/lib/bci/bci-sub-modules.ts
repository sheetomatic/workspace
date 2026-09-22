/** BCI suite parts a person can be granted. Empty = none (not inherited). */

export type BciSubModuleId =
  | "fms"
  | "checklists"
  | "taskDelegation"
  | "em"
  | "mis"
  | "pc";

export type BciSubModuleDef = {
  id: BciSubModuleId;
  label: string;
  href: string;
  description: string;
};

export const BCI_SUB_MODULES = [
  {
    id: "fms",
    label: "FMS",
    href: "/app/fms",
    description: "Flow steps, planned and actual, and delays.",
  },
  {
    id: "checklists",
    label: "Check Lists",
    href: "/app/checklists",
    description: "Process checklists for any department.",
  },
  {
    id: "taskDelegation",
    label: "Task Delegation",
    href: "/app/tasks",
    description: "BCI task delegation. Separate from the Tasks module.",
  },
  {
    id: "em",
    label: "EM",
    href: "/app/em",
    description: "Weekly executive meeting, exceptions first.",
  },
  {
    id: "mis",
    label: "MIS Score",
    href: "/app/fms/scores",
    description: "Person-wise deficit scores for the meeting.",
  },
  {
    id: "pc",
    label: "PC jobs",
    href: "/app/pc/today",
    description: "Process coordinator chase list.",
  },
] as const satisfies readonly BciSubModuleDef[];

const BCI_SUB_MODULE_IDS = new Set<string>(BCI_SUB_MODULES.map((mod) => mod.id));

export function isKnownBciSubModuleId(value: string): value is BciSubModuleId {
  return BCI_SUB_MODULE_IDS.has(value);
}

/** Stored ids only. Blank means this person has no BCI access. */
export function resolveMemberBciSubModules(
  memberStored: string[] | null | undefined,
): BciSubModuleId[] {
  if (!memberStored || memberStored.length === 0) {
    return [];
  }
  return memberStored.filter(isKnownBciSubModuleId);
}

export function persistEnabledBciSubModules(checked: string[]): string[] {
  return checked.filter(isKnownBciSubModuleId);
}
