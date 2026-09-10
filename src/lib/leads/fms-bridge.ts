import type { InboundLead, LeadSourceChannel, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  buildReferenceLabel,
  createFmsInstanceFromSubmission,
} from "@/lib/fms/instance-lifecycle";
import { fmsSourceLabelForChannel } from "@/lib/leads/channels";

async function resolveSubmitterUserId(organizationId: string) {
  const membership = await prisma.membership.findFirst({
    where: {
      organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    orderBy: { role: "asc" },
    select: { userId: true },
  });
  return membership?.userId ?? null;
}

const leadFmsTemplateInclude = {
  form: { include: { fields: { orderBy: { sortOrder: "asc" as const } } } },
  steps: { orderBy: { sortOrder: "asc" as const } },
} as const;

export async function listActiveFmsTemplatesForLead(organizationId: string) {
  return prisma.fmsTemplate.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function findLeadToClosureTemplate(organizationId: string) {
  return prisma.fmsTemplate.findFirst({
    where: {
      organizationId,
      status: "ACTIVE",
      OR: [
        { name: { contains: "Lead to Closure", mode: "insensitive" } },
        { name: { contains: "Lead to Sales", mode: "insensitive" } },
      ],
    },
    include: leadFmsTemplateInclude,
  });
}

async function loadLeadFmsTemplate(
  organizationId: string,
  templateId?: string,
) {
  if (templateId?.trim()) {
    return prisma.fmsTemplate.findFirst({
      where: {
        id: templateId.trim(),
        organizationId,
        status: "ACTIVE",
      },
      include: leadFmsTemplateInclude,
    });
  }

  const named = await findLeadToClosureTemplate(organizationId);
  if (named) {
    return named;
  }

  return prisma.fmsTemplate.findFirst({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: leadFmsTemplateInclude,
  });
}

export async function bridgeInboundLeadToFms(params: {
  organizationId: string;
  lead: Pick<
    InboundLead,
    | "id"
    | "channel"
    | "name"
    | "phone"
    | "email"
    | "city"
    | "requirement"
    | "sourceDetail"
    | "fmsInstanceId"
  >;
  actorUserId?: string;
  templateId?: string;
}) {
  if (params.lead.fmsInstanceId) {
    return {
      ok: true as const,
      instanceId: params.lead.fmsInstanceId,
      skipped: true,
      templateName: null,
    };
  }

  const template = await loadLeadFmsTemplate(
    params.organizationId,
    params.templateId,
  );
  if (!template?.form) {
    return { ok: false as const, reason: "no_lead_fms_template" as const };
  }

  const submitterId =
    params.actorUserId ?? (await resolveSubmitterUserId(params.organizationId));
  if (!submitterId) {
    return { ok: false as const, reason: "no_submitter" as const };
  }

  const values: Record<string, unknown> = {
    lead_name:
      params.lead.name?.trim() ||
      params.lead.phone?.trim() ||
      params.lead.email?.trim() ||
      "Inbound lead",
    contact: params.lead.phone?.trim() || params.lead.email?.trim() || "N/A",
    source: fmsSourceLabelForChannel(params.lead.channel as LeadSourceChannel),
    requirement: [
      params.lead.requirement?.trim(),
      params.lead.sourceDetail?.trim() ? `Detail: ${params.lead.sourceDetail.trim()}` : null,
      params.lead.city?.trim() ? `City: ${params.lead.city.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const submission = await prisma.fmsFormSubmission.create({
    data: {
      organizationId: params.organizationId,
      formId: template.form.id,
      submittedById: submitterId,
      values: values as Prisma.InputJsonValue,
    },
  });

  const referenceLabel = buildReferenceLabel(values, template.form.fields);
  const instance = await createFmsInstanceFromSubmission({
    organizationId: params.organizationId,
    template,
    submissionId: submission.id,
    referenceLabel,
  });

  await prisma.inboundLead.update({
    where: { id: params.lead.id },
    data: { fmsInstanceId: instance.id },
  });

  return {
    ok: true as const,
    instanceId: instance.id,
    skipped: false,
    templateName: template.name,
  };
}

export async function getFmsStepSummaryForLead(fmsInstanceId: string | null) {
  if (!fmsInstanceId) {
    return null;
  }

  const instance = await prisma.fmsInstance.findUnique({
    where: { id: fmsInstanceId },
    include: {
      stepStates: {
        include: { step: true },
        orderBy: { step: { sortOrder: "asc" } },
      },
    },
  });

  if (!instance) {
    return null;
  }

  const active = instance.stepStates.find((s) => s.status === "IN_PROGRESS");
  const doneCount = instance.stepStates.filter((s) => s.status === "DONE").length;

  return {
    instanceId: instance.id,
    instanceStatus: instance.status,
    activeStep: active?.step.stepName ?? null,
    progress: `${doneCount}/${instance.stepStates.length}`,
    referenceLabel: instance.referenceLabel,
  };
}
