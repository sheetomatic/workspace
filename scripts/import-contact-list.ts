/**
 * One-off import of a Name<TAB>Phone contact list into the CRM.
 *
 * Rules:
 * - Skips team members' numbers, invalid/fake phones, and junk test rows.
 * - Dedupe by last-10 digits: inside the list and against existing CRM leads.
 * - Existing leads are only enriched with a name if they have none.
 *
 * Usage:
 *   npx tsx scripts/import-contact-list.ts <tsv-path>            # dry run
 *   npx tsx scripts/import-contact-list.ts <tsv-path> --apply    # write
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

function scriptDatabaseUrl() {
  const base = process.env.DATABASE_URL ?? "";
  if (!base || base.includes("connection_limit=")) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}connection_limit=2&pool_timeout=30`;
}

const prisma = new PrismaClient({
  datasources: { db: { url: scriptDatabaseUrl() } },
});

const JUNK_NAMES = new Set([
  "test", "abc", "xyz", "asdf", "asdfasdf", "sdf", "ads", "fdf", "dzx",
  "rew", "ass", "gg", "ghf", "mm", "a", "p", "ss", "xxxxxx", "dgjssn",
  "shbssn", "yuiiy", "rttt", "w4rtdgf", "gfshdgaskjl", "safdsfd",
  "asdkhbsdfd", "dff", "heri", "y[h7g9g7fg", "ann", "gg", "hgf",
]);

function cleanPhone(raw: string): string | null {
  // Multiple numbers in one cell — take the first.
  const first = raw.split(",")[0] ?? "";
  const digits = first.replace(/\D/g, "").replace(/^00/, "");
  if (digits.length < 10 || digits.length > 15) return null;
  const last10 = digits.slice(-10);
  // Fake patterns: fewer than 3 distinct digits in the last 10 (9999999999, 9090909090…).
  if (new Set(last10.split("")).size < 3) return null;
  return digits;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [2000, 5000, 15000];
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= delays.length) throw error;
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const path = args.find((a) => !a.startsWith("--"));
  if (!path) {
    console.error("Pass the TSV path (Name<TAB>Phone per line).");
    process.exit(1);
  }

  const counts = await prisma.inboundLead.groupBy({
    by: ["organizationId"],
    _count: { _all: true },
    orderBy: { _count: { organizationId: "desc" } },
  });
  const organizationId = counts[0]?.organizationId;
  if (!organizationId) throw new Error("No organization with leads found.");
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });
  console.log(`Target workspace: ${org?.name} (${organizationId})`);

  const members = await prisma.membership.findMany({
    where: { organizationId },
    select: { user: { select: { name: true, email: true, phone: true } } },
  });
  const teamPhones = new Map<string, string>();
  for (const m of members) {
    const digits = m.user.phone?.replace(/\D/g, "") ?? "";
    if (digits.length >= 10)
      teamPhones.set(digits.slice(-10), m.user.name ?? m.user.email);
  }

  const existing = await prisma.inboundLead.findMany({
    where: { organizationId },
    select: { id: true, phone: true, name: true },
  });
  const leadByPhone = new Map<string, { id: string; name: string | null }>();
  for (const lead of existing) {
    const digits = lead.phone?.replace(/\D/g, "") ?? "";
    if (digits.length >= 10 && !leadByPhone.has(digits.slice(-10))) {
      leadByPhone.set(digits.slice(-10), { id: lead.id, name: lead.name });
    }
  }

  const lines = readFileSync(path, "utf8").split("\n");
  const seen = new Set<string>();
  const skippedRows: string[] = [];
  let dupInList = 0;
  let alreadyInCrm = 0;
  let nameFilled = 0;
  let teamSkipped = 0;
  const teamSkipNames = new Set<string>();
  let created = 0;
  const createdList: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const [nameRaw, phoneRaw] = line.split("\t");
    const name = nameRaw?.trim() ?? "";
    const phone = cleanPhone(phoneRaw ?? "");

    if (!phone) {
      skippedRows.push(`${name} → "${(phoneRaw ?? "").trim()}" (invalid phone)`);
      continue;
    }
    if (JUNK_NAMES.has(name.toLowerCase()) || /@/.test(name)) {
      skippedRows.push(`${name} → ${phone} (junk/test name)`);
      continue;
    }

    const last10 = phone.slice(-10);
    if (seen.has(last10)) {
      dupInList += 1;
      continue;
    }
    seen.add(last10);

    if (teamPhones.has(last10)) {
      teamSkipped += 1;
      teamSkipNames.add(teamPhones.get(last10)!);
      continue;
    }

    const match = leadByPhone.get(last10);
    if (match) {
      if (!match.name?.trim() && name) {
        nameFilled += 1;
        if (apply) {
          await withRetry(() =>
            prisma.inboundLead.update({
              where: { id: match.id },
              data: { name },
            }),
          );
        }
      } else {
        alreadyInCrm += 1;
      }
      continue;
    }

    created += 1;
    createdList.push(`${name || "(no name)"} → ${phone}`);
    if (apply) {
      await withRetry(() =>
        prisma.inboundLead.create({
          data: {
            organizationId,
            channel: "MANUAL",
            externalId: `contact-list-${last10}`,
            name: name || null,
            phone,
            sourceDetail: "Contact list import",
            status: "NEW",
          },
        }),
      );
    }
  }

  console.log(`\n${apply ? "APPLIED" : "DRY RUN (pass --apply to write)"}`);
  console.log(`Duplicates within list:  ${dupInList}`);
  console.log(`Team numbers excluded:   ${teamSkipped} (${[...teamSkipNames].join(", ") || "—"})`);
  console.log(`Already in CRM:          ${alreadyInCrm}`);
  console.log(`Existing, name filled:   ${nameFilled}`);
  console.log(`New leads to create:     ${created}`);
  for (const row of createdList) console.log(`  + ${row}`);
  console.log(`\nSkipped rows (${skippedRows.length}):`);
  for (const row of skippedRows) console.log(`  - ${row}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
