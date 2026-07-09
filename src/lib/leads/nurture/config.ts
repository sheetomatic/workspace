import type { LeadNurtureEventId } from "@/lib/leads/nurture/templates";
import { LEAD_NURTURE_EVENT_LABELS, STAGE_NURTURE_MIN_GAP_HOURS } from "@/lib/leads/nurture/templates";
import { prisma } from "@/lib/db";

export type LeadNurtureOrgConfig = {
  enabled: boolean;
  stageMinGapHours: number;
  templates: Partial<Record<LeadNurtureEventId, string>>;
};

export const NURTURE_TEMPLATE_PLACEHOLDERS = [
  { key: "{{firstName}}", label: "Lead first name" },
  { key: "{{requirement}}", label: "Requirement text" },
  { key: "{{company}}", label: "Company name" },
  { key: "{{topic}}", label: "Category / topic" },
  { key: "{{counsellor}}", label: "Assigned team member" },
  { key: "{{discussion}}", label: "Call / meeting notes" },
  { key: "{{nextStep}}", label: "Next step / stage label" },
] as const;

export const DEFAULT_NURTURE_TEMPLATES: Record<LeadNurtureEventId, string> = {
  welcome: `Hi {{firstName}},

Thank you for contacting *Sheetomatic*!
We have received your inquiry regarding *{{requirement}}*.

Our team will contact you *very soon* on this WhatsApp number.
No need to call us — we have your details and will reach out shortly.

— Team Sheetomatic`,

  assigned: `Hi {{firstName}},

Good news — your inquiry has been assigned to *{{counsellor}}* from our team.

{{counsellor}} will be *calling you shortly* on this number to understand your requirement in detail.

If you miss the call, reply *CALL* here and we will ring you back.

— Team Sheetomatic`,

  post_call: `Hi {{firstName}},

Thank you for speaking with us — {{counsellor}}.

*As discussed:*
{{discussion}}

*Next step:* {{nextStep}}

If anything was missed in our notes, reply here and we will update it.

— {{counsellor}}, Sheetomatic`,

  stage_schedule_meeting: `Hi {{firstName}},

As discussed, let's schedule a short demo / meeting.

Please share *2 convenient time slots* (Mon–Sat, 11 AM–6 PM IST) and we will confirm on WhatsApp.

— Team Sheetomatic`,

  stage_proposal: `Hi {{firstName}},

We are preparing the *proposal / quotation* for your *{{topic}}* requirement.

Our team will share it with you shortly. Reply here if you have any questions on scope or pricing.

— Team Sheetomatic`,

  stage_follow_up: `Hi {{firstName}},

Just a gentle follow-up on your inquiry with Sheetomatic.

Reply *YES* if you are still exploring, or *LATER* if we should check back next week.

— Team Sheetomatic`,

  stage_qualified: `Hi {{firstName}},

Thank you — your requirement looks like a good fit for Sheetomatic.

We will share the next steps (demo scope, timeline, and commercial) based on our discussion.

— Team Sheetomatic`,
};

const NURTURE_EVENT_IDS = Object.keys(LEAD_NURTURE_EVENT_LABELS) as LeadNurtureEventId[];

export const NURTURE_EVENT_ORDER: LeadNurtureEventId[] = [
  "welcome",
  "assigned",
  "post_call",
  "stage_schedule_meeting",
  "stage_proposal",
  "stage_follow_up",
  "stage_qualified",
];

function isNurtureEventId(value: string): value is LeadNurtureEventId {
  return NURTURE_EVENT_IDS.includes(value as LeadNurtureEventId);
}

export function defaultLeadNurtureConfig(): LeadNurtureOrgConfig {
  return {
    enabled: true,
    stageMinGapHours: STAGE_NURTURE_MIN_GAP_HOURS,
    templates: { ...DEFAULT_NURTURE_TEMPLATES },
  };
}

export function parseLeadNurtureConfig(raw: unknown): LeadNurtureOrgConfig {
  const defaults = defaultLeadNurtureConfig();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }
  const input = raw as Record<string, unknown>;
  const templates: Partial<Record<LeadNurtureEventId, string>> = {
    ...defaults.templates,
  };

  if (input.templates && typeof input.templates === "object") {
    for (const [key, value] of Object.entries(input.templates)) {
      if (isNurtureEventId(key) && typeof value === "string" && value.trim()) {
        templates[key] = value.trim();
      }
    }
  }

  const gap =
    typeof input.stageMinGapHours === "number" && input.stageMinGapHours >= 0
      ? Math.min(input.stageMinGapHours, 168)
      : defaults.stageMinGapHours;

  return {
    enabled: input.enabled !== false,
    stageMinGapHours: gap,
    templates,
  };
}

export async function getLeadNurtureConfig(
  organizationId: string,
): Promise<LeadNurtureOrgConfig> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { leadNurtureConfig: true },
  });
  return parseLeadNurtureConfig(org?.leadNurtureConfig);
}

export async function saveLeadNurtureConfig(
  organizationId: string,
  config: LeadNurtureOrgConfig,
) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { leadNurtureConfig: config as object },
  });
}

export function interpolateNurtureTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(key).join(value);
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export function resolveNurtureTemplate(
  event: LeadNurtureEventId,
  config: LeadNurtureOrgConfig,
): string {
  return config.templates[event]?.trim() || DEFAULT_NURTURE_TEMPLATES[event];
}
