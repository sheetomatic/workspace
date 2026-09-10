import { prisma } from "@/lib/db";

/** Deletes one FMS job. The workflow/template stays. */
export async function deleteFmsInstanceJob(
  organizationId: string,
  instanceId: string,
) {
  const instance = await prisma.fmsInstance.findFirst({
    where: { id: instanceId, organizationId },
    select: { id: true, submissionId: true },
  });
  if (!instance) {
    throw new Error("FMS job not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.inboundLead.updateMany({
      where: { organizationId, fmsInstanceId: instanceId },
      data: { fmsInstanceId: null },
    });
    await tx.fmsAuditEvent.deleteMany({
      where: { organizationId, instanceId },
    });
    await tx.fmsInstance.delete({
      where: { id: instanceId },
    });
    if (instance.submissionId) {
      await tx.fmsFormSubmission.deleteMany({
        where: { id: instance.submissionId, organizationId },
      });
    }
  });
}

/** Deletes FMS jobs for one workflow. The template stays. */
export async function clearTemplateFmsJobs(
  organizationId: string,
  templateId: string,
) {
  return prisma.$transaction(async (tx) => {
    const instances = await tx.fmsInstance.findMany({
      where: { organizationId, templateId },
      select: { id: true, submissionId: true },
    });
    const ids = instances.map((instance) => instance.id);
    const submissionIds = instances
      .map((instance) => instance.submissionId)
      .filter((id): id is string => Boolean(id));

    if (ids.length === 0) {
      return { jobs: 0, unlinkedLeads: 0 };
    }

    const unlinkedLeads = await tx.inboundLead.updateMany({
      where: { organizationId, fmsInstanceId: { in: ids } },
      data: { fmsInstanceId: null },
    });
    await tx.fmsAuditEvent.deleteMany({
      where: { organizationId, instanceId: { in: ids } },
    });
    const jobs = await tx.fmsInstance.deleteMany({
      where: { organizationId, templateId },
    });
    if (submissionIds.length > 0) {
      await tx.fmsFormSubmission.deleteMany({
        where: { id: { in: submissionIds }, organizationId },
      });
    }
    return { jobs: jobs.count, unlinkedLeads: unlinkedLeads.count };
  });
}

/** Deletes FMS jobs (instances) for one org. Workflows/templates are kept. */
export async function clearOrganizationFmsJobs(organizationId: string) {
  return prisma.$transaction(async (tx) => {
    const unlinkedLeads = await tx.inboundLead.updateMany({
      where: { organizationId, fmsInstanceId: { not: null } },
      data: { fmsInstanceId: null },
    });
    await tx.fmsAuditEvent.deleteMany({ where: { organizationId } });
    const jobs = await tx.fmsInstance.deleteMany({ where: { organizationId } });
    await tx.fmsFormSubmission.deleteMany({ where: { organizationId } });
    return { jobs: jobs.count, unlinkedLeads: unlinkedLeads.count };
  });
}
