/**
 * One-off import of the old Google Form enquiries CSV (2024–26) into the CRM.
 *
 * Rules:
 * - Never creates a lead for a workspace team member's phone number.
 * - Deduplicates inside the CSV (same phone/email merged, earliest enquiry
 *   date kept as capturedAt, latest non-empty details win).
 * - Existing CRM leads (matched by phone last-10 digits or email) are only
 *   FILLED IN — no existing value or status is overwritten.
 * - No side effects: no notifications, no WhatsApp nurture, no FMS jobs.
 *
 * Usage:
 *   npx tsx scripts/import-old-enquiries-csv.ts <csv-path>            # dry run
 *   npx tsx scripts/import-old-enquiries-csv.ts <csv-path> --apply    # write
 *   Optional: --org <organizationId> (defaults to the org with most leads)
 */
import { PrismaClient, type InboundLeadStatus } from "@prisma/client";
import { readFileSync } from "node:fs";

function scriptDatabaseUrl() {
  const base = process.env.DATABASE_URL ?? "";
  if (!base) return base;
  if (base.includes("connection_limit=")) return base;
  const sep = base.includes("?") ? "&" : "?";
  // Light footprint: this is a slow sequential import next to a live app.
  return `${base}${sep}connection_limit=2&pool_timeout=30`;
}

const prisma = new PrismaClient({
  datasources: { db: { url: scriptDatabaseUrl() } },
});

/** RFC 4180 parser — handles quoted fields containing commas and newlines. */
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && content[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

function last10(phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 10 ? digits.slice(-10) : null;
}

/** "18/09/2025 23:15:16" (IST) → Date */
function parseTimestamp(raw: string): Date | null {
  const m = raw
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, min, ss] = m;
  const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T${hh.padStart(2, "0")}:${min}:${(ss ?? "00").padStart(2, "0")}+05:30`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

const STATUS_MAP: Record<string, InboundLeadStatus> = {
  "next time": "LOST",
  converted: "WON",
  "new leads": "NEW",
  "follow up": "FOLLOW_UP",
  qualified: "QUALIFIED",
  "proposal sent": "PROPOSAL",
  generic: "NEW",
};

type CsvLead = {
  capturedAt: Date | null;
  name: string | null;
  phone10: string | null;
  phoneRaw: string | null;
  email: string | null;
  company: string | null;
  requirement: string | null;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  sourceDetail: string | null;
  status: InboundLeadStatus;
  remarks: string | null;
  assignedToEmail: string | null;
};

function clean(value: string | undefined) {
  const v = value?.trim();
  return v ? v : null;
}

/** Neon pooler can stall under sustained writes — retry with backoff. */
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

/** Later record's non-empty values win; earliest enquiry date is kept. */
function mergeRecords(base: CsvLead, next: CsvLead): CsvLead {
  return {
    capturedAt:
      base.capturedAt && next.capturedAt
        ? base.capturedAt <= next.capturedAt
          ? base.capturedAt
          : next.capturedAt
        : base.capturedAt ?? next.capturedAt,
    name: next.name ?? base.name,
    phone10: next.phone10 ?? base.phone10,
    phoneRaw: next.phoneRaw ?? base.phoneRaw,
    email: next.email ?? base.email,
    company: next.company ?? base.company,
    requirement: next.requirement ?? base.requirement,
    address: next.address ?? base.address,
    city: next.city ?? base.city,
    zipCode: next.zipCode ?? base.zipCode,
    sourceDetail: next.sourceDetail ?? base.sourceDetail,
    status: next.status,
    remarks: [base.remarks, next.remarks].filter(Boolean).join(" | ") || null,
    assignedToEmail: next.assignedToEmail ?? base.assignedToEmail,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const orgFlag = args.indexOf("--org");
  const orgIdArg = orgFlag >= 0 ? args[orgFlag + 1] : null;
  const csvPath = args.find((a) => a.endsWith(".csv"));
  if (!csvPath) {
    console.error("Pass the CSV path as the first argument.");
    process.exit(1);
  }

  // Resolve target organization (most leads = the active CRM workspace).
  let organizationId = orgIdArg;
  if (!organizationId) {
    const counts = await prisma.inboundLead.groupBy({
      by: ["organizationId"],
      _count: { _all: true },
      orderBy: { _count: { organizationId: "desc" } },
    });
    organizationId = counts[0]?.organizationId ?? null;
  }
  if (!organizationId) {
    console.error("No organization with leads found. Pass --org <id>.");
    process.exit(1);
  }
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  console.log(`Target workspace: ${org?.name} (${organizationId})`);

  // Team member phones — these must never be leads.
  const members = await prisma.membership.findMany({
    where: { organizationId },
    select: { user: { select: { id: true, name: true, email: true, phone: true } } },
  });
  const teamPhones = new Map<string, string>();
  const usersByEmail = new Map<string, string>();
  for (const m of members) {
    const p = last10(m.user.phone);
    if (p) teamPhones.set(p, m.user.name ?? m.user.email);
    usersByEmail.set(m.user.email.toLowerCase(), m.user.id);
  }

  // Parse CSV.
  const table = parseCsv(readFileSync(csvPath, "utf8"));
  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());
  const idx = {
    ts: col("Timestamp"),
    name: col("Full Name"),
    phone: col("Contact Number"),
    email: col("Email Address"),
    company: col("Company"),
    requirement: col("Requirement Description"),
    address: col("Address"),
    city: col("City"),
    zip: col("Zip"),
    heard: col("Where did you hear about us?"),
    status: col("Leads Status"),
    remarks: col("Remarks"),
    assigned: col("Assigned To Email"),
  };

  const records: CsvLead[] = [];
  let noContact = 0;
  for (let i = 1; i < table.length; i += 1) {
    const row = table[i];
    const get = (j: number) => (j >= 0 ? clean(row[j]) : null);
    const phoneRaw = get(idx.phone);
    const phone10 = last10(phoneRaw);
    const email = get(idx.email)?.toLowerCase() ?? null;
    if (!phone10 && !email) {
      noContact += 1;
      continue;
    }
    const statusRaw = (get(idx.status) ?? "").toLowerCase();
    records.push({
      capturedAt: parseTimestamp(get(idx.ts) ?? ""),
      name: get(idx.name),
      phone10,
      phoneRaw,
      email,
      company: get(idx.company),
      requirement: get(idx.requirement),
      address: get(idx.address),
      city: get(idx.city),
      zipCode: get(idx.zip),
      sourceDetail: get(idx.heard),
      status: STATUS_MAP[statusRaw] ?? "NEW",
      remarks: get(idx.remarks),
      assignedToEmail: get(idx.assigned)?.toLowerCase() ?? null,
    });
  }

  // Sort oldest → newest, then dedupe inside the CSV by phone (or email).
  records.sort(
    (a, b) => (a.capturedAt?.getTime() ?? 0) - (b.capturedAt?.getTime() ?? 0),
  );
  const byKey = new Map<string, CsvLead>();
  for (const rec of records) {
    const key = rec.phone10 ? `p:${rec.phone10}` : `e:${rec.email}`;
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeRecords(existing, rec) : rec);
  }

  // Existing CRM leads for matching.
  const existingLeads = await prisma.inboundLead.findMany({
    where: { organizationId },
    select: {
      id: true,
      phone: true,
      email: true,
      name: true,
      company: true,
      requirement: true,
      address: true,
      city: true,
      zipCode: true,
      sourceDetail: true,
      meetingNotes: true,
      capturedAt: true,
    },
  });
  const leadByPhone = new Map<string, (typeof existingLeads)[number]>();
  const leadByEmail = new Map<string, (typeof existingLeads)[number]>();
  for (const lead of existingLeads) {
    const p = last10(lead.phone);
    if (p && !leadByPhone.has(p)) leadByPhone.set(p, lead);
    const e = lead.email?.trim().toLowerCase();
    if (e && !leadByEmail.has(e)) leadByEmail.set(e, lead);
  }

  let teamSkipped = 0;
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const teamSkipNames = new Set<string>();

  for (const [key, rec] of byKey) {
    if (rec.phone10 && teamPhones.has(rec.phone10)) {
      teamSkipped += 1;
      teamSkipNames.add(teamPhones.get(rec.phone10)!);
      continue;
    }

    const match =
      (rec.phone10 ? leadByPhone.get(rec.phone10) : undefined) ??
      (rec.email ? leadByEmail.get(rec.email) : undefined);

    if (match) {
      // Fill only missing fields; never overwrite worked CRM data or status.
      const fill: Record<string, unknown> = {};
      if (!match.name?.trim() && rec.name) fill.name = rec.name;
      if (!match.email?.trim() && rec.email) fill.email = rec.email;
      if (!match.phone?.trim() && rec.phone10) fill.phone = rec.phone10;
      if (!match.company?.trim() && rec.company) fill.company = rec.company;
      if (!match.requirement?.trim() && rec.requirement)
        fill.requirement = rec.requirement;
      if (!match.address?.trim() && rec.address) fill.address = rec.address;
      if (!match.city?.trim() && rec.city) fill.city = rec.city;
      if (!match.zipCode?.trim() && rec.zipCode) fill.zipCode = rec.zipCode;
      if (!match.sourceDetail?.trim() && rec.sourceDetail)
        fill.sourceDetail = rec.sourceDetail;
      if (!match.meetingNotes?.trim() && rec.remarks)
        fill.meetingNotes = rec.remarks;
      if (
        rec.capturedAt &&
        (!match.capturedAt || rec.capturedAt < match.capturedAt)
      ) {
        fill.capturedAt = rec.capturedAt;
      }

      if (Object.keys(fill).length === 0) {
        unchanged += 1;
        continue;
      }
      updated += 1;
      if (apply) {
        await withRetry(() =>
          prisma.inboundLead.update({ where: { id: match.id }, data: fill }),
        );
      }
      continue;
    }

    created += 1;
    if (apply) {
      await withRetry(() =>
        prisma.inboundLead.create({
        data: {
          organizationId,
          channel: "MANUAL",
          externalId: `old-enquiries-${key}`,
          name: rec.name,
          phone: rec.phone10 ?? rec.phoneRaw,
          email: rec.email,
          company: rec.company,
          requirement: rec.requirement,
          address: rec.address,
          city: rec.city,
          zipCode: rec.zipCode,
          sourceDetail: rec.sourceDetail
            ? `${rec.sourceDetail} · Old enquiries import`
            : "Old enquiries import",
          meetingNotes: rec.remarks,
          status: rec.status,
          capturedAt: rec.capturedAt ?? undefined,
          assignedToId: rec.assignedToEmail
            ? usersByEmail.get(rec.assignedToEmail) ?? undefined
            : undefined,
        },
        }),
      );
    }
  }

  console.log(`\n${apply ? "APPLIED" : "DRY RUN (pass --apply to write)"}`);
  console.log(`CSV rows parsed:        ${records.length} (+${noContact} without any contact, skipped)`);
  console.log(`Unique people in CSV:   ${byKey.size}`);
  console.log(`Team numbers excluded:  ${teamSkipped} (${[...teamSkipNames].join(", ") || "—"})`);
  console.log(`Existing leads updated: ${updated} (missing info filled only)`);
  console.log(`Existing, nothing new:  ${unchanged}`);
  console.log(`New leads created:      ${created}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
