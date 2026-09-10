import { prisma } from "@/lib/db";

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
