/**
 * Identify leads whose phone belongs to a workspace team member and archive
 * them (soft delete — recoverable via "Show archived").
 *
 * Usage:
 *   npx tsx scripts/archive-team-number-leads.ts          # dry run (report only)
 *   npx tsx scripts/archive-team-number-leads.ts --apply  # archive the matches
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function last10(phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 10 ? digits.slice(-10) : null;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const memberships = await prisma.membership.findMany({
    where: { user: { phone: { not: null } } },
    select: {
      organizationId: true,
      organization: { select: { name: true } },
      user: { select: { name: true, email: true, phone: true } },
    },
  });

  const phonesByOrg = new Map<
    string,
    { orgName: string; phones: Map<string, string> }
  >();
  for (const m of memberships) {
    const key = last10(m.user.phone);
    if (!key) continue;
    const entry = phonesByOrg.get(m.organizationId) ?? {
      orgName: m.organization.name,
      phones: new Map<string, string>(),
    };
    entry.phones.set(key, m.user.name ?? m.user.email);
    phonesByOrg.set(m.organizationId, entry);
  }

  let totalMatched = 0;
  const idsToArchive: string[] = [];

  for (const [organizationId, { orgName, phones }] of phonesByOrg) {
    const leads = await prisma.inboundLead.findMany({
      where: { organizationId, phone: { not: null }, archivedAt: null },
      select: { id: true, name: true, phone: true, status: true, channel: true },
    });

    const matches = leads.filter((lead) => {
      const key = last10(lead.phone);
      return key !== null && phones.has(key);
    });
    if (matches.length === 0) continue;

    console.log(`\nWorkspace: ${orgName} (${organizationId})`);
    for (const lead of matches) {
      const member = phones.get(last10(lead.phone)!);
      console.log(
        `  - lead "${lead.name ?? "Unnamed"}" ${lead.phone} [${lead.channel}/${lead.status}] -> team member: ${member} (${lead.id})`,
      );
      idsToArchive.push(lead.id);
    }
    totalMatched += matches.length;
  }

  if (totalMatched === 0) {
    console.log("No leads matching team member numbers found.");
    return;
  }

  if (!apply) {
    console.log(
      `\nDRY RUN: ${totalMatched} lead(s) would be archived. Re-run with --apply to archive.`,
    );
    return;
  }

  const result = await prisma.inboundLead.updateMany({
    where: { id: { in: idsToArchive } },
    data: { archivedAt: new Date() },
  });
  console.log(`\nArchived ${result.count} lead(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
