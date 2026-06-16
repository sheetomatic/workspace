import type { TaskDepartment } from "@prisma/client";
import type { ParsedFmsFlowStepDraft } from "@/lib/integrations/openai";

export type FmsAssignableMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: TaskDepartment | null;
  designation?: string | null;
};

const DEPT_KEYWORDS: Record<TaskDepartment, string[]> = {
  ACCOUNTS: [
    "account",
    "finance",
    "financial",
    "billing",
    "payment",
    "payable",
    "treasury",
    "invoice",
    "gst",
    "tax",
  ],
  OPERATIONS: [
    "ops",
    "operation",
    "warehouse",
    "logistics",
    "delivery",
    "store",
    "procurement",
    "purchase",
    "buyer",
    "vendor",
    "sourcing",
    "inventory",
    "dispatch",
    "receiv",
  ],
  SALES: ["sales", "commercial", "business dev", "bd", "customer", "client"],
  ADMIN: [
    "admin",
    "hr",
    "human resource",
    "office",
    "coordinator",
    "executive assistant",
    "general",
  ],
  GENERAL: ["general", "support", "helpdesk"],
};

const OWNER_KEYWORDS = [
  "owner",
  "founder",
  "ceo",
  "director",
  "md",
  "managing director",
  "proprietor",
  "partner",
  "promoter",
  "sign-off",
  "signoff",
  "final approv",
];

const MANAGER_KEYWORDS = [
  "manager",
  "head",
  "lead",
  "supervisor",
  "approv",
  "review",
];

const LEGAL_KEYWORDS = ["legal", "compliance", "registrar", "lawyer", "counsel"];

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function textIncludesKeyword(text: string, keyword: string) {
  const normalized = normalizeText(text);
  const token = normalizeText(keyword);
  return normalized.includes(token);
}

function scoreMemberForContext(
  member: FmsAssignableMember,
  context: string,
  stepIndex: number,
) {
  let score = 0;
  const ctx = normalizeText(context);
  const name = normalizeText(member.name);
  const emailLocal = member.email.split("@")[0]?.toLowerCase() ?? "";
  const designation = normalizeText(member.designation ?? "");

  if (ctx.includes(name) || name.includes(ctx)) {
    score += 100;
  }
  if (emailLocal && ctx.includes(emailLocal)) {
    score += 90;
  }
  if (designation && ctx.includes(designation)) {
    score += 70;
  }

  for (const keyword of OWNER_KEYWORDS) {
    if (textIncludesKeyword(context, keyword)) {
      if (member.role === "OWNER") {
        score += 55;
      }
      if (member.role === "ADMIN") {
        score += 25;
      }
    }
  }

  for (const keyword of MANAGER_KEYWORDS) {
    if (textIncludesKeyword(context, keyword)) {
      if (member.role === "MANAGER" || member.role === "ADMIN") {
        score += 35;
      }
      if (member.role === "OWNER") {
        score += 20;
      }
    }
  }

  for (const keyword of LEGAL_KEYWORDS) {
    if (textIncludesKeyword(context, keyword)) {
      if (textIncludesKeyword(designation, "legal") || textIncludesKeyword(name, "legal")) {
        score += 45;
      }
      if (member.department === "ADMIN") {
        score += 15;
      }
    }
  }

  if (member.department) {
    for (const keyword of DEPT_KEYWORDS[member.department]) {
      if (textIncludesKeyword(context, keyword)) {
        score += 40;
      }
    }
  }

  if (member.role === "STAFF" && textIncludesKeyword(context, "staff")) {
    score += 10;
  }

  // Slight preference for variety on later steps when context is thin
  score += Math.max(0, 3 - stepIndex);

  return score;
}

function pickMemberByRoundRobin(
  members: FmsAssignableMember[],
  stepIndex: number,
  usedCounts: Map<string, number>,
) {
  if (members.length === 0) {
    return null;
  }
  const sorted = [...members].sort((a, b) => {
    const usedA = usedCounts.get(a.id) ?? 0;
    const usedB = usedCounts.get(b.id) ?? 0;
    if (usedA !== usedB) {
      return usedA - usedB;
    }
    return 0;
  });
  const leastUsed = sorted[0];
  const tied = sorted.filter(
    (m) => (usedCounts.get(m.id) ?? 0) === (usedCounts.get(leastUsed.id) ?? 0),
  );
  return tied[stepIndex % tied.length] ?? members[stepIndex % members.length];
}

export function buildStepOwnerContext(step: ParsedFmsFlowStepDraft) {
  return [step.ownerHint, step.ownerRole, step.stepName, step.howInstructions]
    .filter(Boolean)
    .join(" ");
}

export function resolveFlowOwnersBatch(
  steps: ParsedFmsFlowStepDraft[],
  members: FmsAssignableMember[],
): string[] {
  if (members.length === 0) {
    return steps.map(() => "");
  }

  const usedCounts = new Map<string, number>();

  return steps.map((step, index) => {
    const context = buildStepOwnerContext(step);
    let best: FmsAssignableMember | null = null;
    let bestScore = 0;

    for (const member of members) {
      const score = scoreMemberForContext(member, context, index);
      const usedPenalty = (usedCounts.get(member.id) ?? 0) * 12;
      const adjusted = score - usedPenalty;
      if (adjusted > bestScore) {
        bestScore = adjusted;
        best = member;
      }
    }

    if (!best || bestScore < 20) {
      best = pickMemberByRoundRobin(members, index, usedCounts);
    }

    if (!best) {
      return "";
    }

    usedCounts.set(best.id, (usedCounts.get(best.id) ?? 0) + 1);
    return best.id;
  });
}

export function flowNeedsOwnerReview(
  ownerIds: string[],
  members: FmsAssignableMember[],
) {
  if (ownerIds.some((id) => !id)) {
    return true;
  }
  if (members.length <= 1) {
    return false;
  }
  const unique = new Set(ownerIds.filter(Boolean));
  return ownerIds.length > 1 && unique.size === 1;
}

export function memberRoleLabel(member: FmsAssignableMember) {
  const parts = [
    member.role.charAt(0) + member.role.slice(1).toLowerCase(),
    member.department
      ? member.department.charAt(0) + member.department.slice(1).toLowerCase()
      : null,
    member.designation?.trim() || null,
  ].filter(Boolean);
  return parts.join(" · ");
}
