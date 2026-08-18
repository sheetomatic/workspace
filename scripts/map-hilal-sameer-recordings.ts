import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { prisma } from "../src/lib/db";

function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    const filePath = join(process.cwd(), file);
    if (!existsSync(filePath)) continue;
    const text = readFileSync(filePath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key]) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

function driveUrl(id: string) {
  return `https://drive.google.com/file/d/${id}/view?usp=sharing`;
}

/**
 * Gemini notes: Hilal joins as "HRC FASHION", Sameer as "Samir Chakraborty".
 * Sales Requirement Understanding calls are excluded.
 */
const RECORDINGS = [
  {
    id: "1dRAl2C8_B2v93tc7hn-ujVTpnmrz9vpK",
    title: "Class recording — 19 Jul 2026 (08:48)",
    both: false,
    students: ["Sameer Chakraborty"] as const,
    sessionByName: { "Sameer Chakraborty": 1 },
    complete: false,
  },
  {
    id: "14EvOmEIvC0FO_6kWXqDkDOqxT0hfjEET",
    title: "Class recording — 19 Jul 2026 (10:46)",
    both: false,
    students: ["Sameer Chakraborty"] as const,
    sessionByName: { "Sameer Chakraborty": 1 },
    complete: false,
  },
  {
    id: "1E82hbBqmBDzYYGqQzH7XaXLS8NA_cRen",
    title: "Class recording — 25 Jul 2026",
    both: false,
    students: ["Sameer Chakraborty"] as const,
    sessionByName: { "Sameer Chakraborty": 2 },
    complete: false,
  },
  {
    id: "1FcVx6fnpsriZEQ_Xqe4_yJ0e3NZYU5ed",
    title: "Class recording — 8 Aug 2026",
    both: true,
    students: ["Sameer Chakraborty", "Mohd Hilal"] as const,
    sessionByName: { "Sameer Chakraborty": 6, "Mohd Hilal": 7 },
    complete: false,
  },
  {
    id: "1o27BBi2XbqeHuHX4bBvISEw1IBZ3ZWmG",
    title: "Class recording — 10 Aug 2026",
    both: true,
    students: ["Sameer Chakraborty", "Mohd Hilal"] as const,
    sessionByName: { "Sameer Chakraborty": 7, "Mohd Hilal": 8 },
    complete: false,
  },
  {
    id: "1OjHjqoV5iWcBetGvN_Hz9gRa93V8Tvkh",
    title: "Class recording — 15 Aug 2026",
    both: true,
    students: ["Sameer Chakraborty", "Mohd Hilal"] as const,
    sessionByName: { "Sameer Chakraborty": 8, "Mohd Hilal": 9 },
    complete: true,
  },
  {
    id: "1EVC8lIaQPx8qlWDg1wzK1p34d-Mk8y6K",
    title: "Class recording — 18 Aug 2026",
    both: true,
    students: ["Sameer Chakraborty", "Mohd Hilal"] as const,
    sessionByName: { "Sameer Chakraborty": 9, "Mohd Hilal": 10 },
    complete: true,
  },
];

const WRONG_FILE_IDS = RECORDINGS.map((row) => row.id);

async function main() {
  loadEnvFiles();
  const apply = process.argv.includes("--apply");

  const existing = await prisma.trainingSessionMaterial.findMany({
    where: {
      kind: "RECORDING",
      OR: WRONG_FILE_IDS.map((id) => ({ url: { contains: id } })),
    },
    select: {
      id: true,
      url: true,
      title: true,
      slotId: true,
      slot: {
        select: {
          sessionNumber: true,
          status: true,
          enrollment: { select: { name: true } },
        },
      },
    },
  });

  console.log("Current attachments");
  for (const row of existing) {
    console.log(
      `  ${row.slot.enrollment.name} #${row.slot.sessionNumber} (${row.slot.status}) ${row.title}`,
    );
  }

  const enrollments = await prisma.courseEnrollment.findMany({
    where: {
      OR: [
        { name: { equals: "Sameer Chakraborty" } },
        { name: { equals: "Mohd Hilal" } },
      ],
    },
    select: {
      id: true,
      name: true,
      slots: {
        select: {
          id: true,
          sessionNumber: true,
          status: true,
          materials: { select: { id: true, kind: true, url: true } },
        },
      },
    },
  });
  const byName = new Map(enrollments.map((row) => [row.name, row]));

  const keepSlotIds = new Set<string>();
  for (const rec of RECORDINGS) {
    for (const name of rec.students) {
      const enrollment = byName.get(name);
      const session = rec.sessionByName[name];
      const slot = enrollment?.slots.find((item) => item.sessionNumber === session);
      if (slot) keepSlotIds.add(slot.id);
    }
  }

  const toRemove = existing.filter((row) => !keepSlotIds.has(row.slotId));
  console.log(`\nUnmap wrong attachments: ${toRemove.length}`);
  for (const row of toRemove) {
    console.log(
      `  ${apply ? "remove" : "would-remove"}  ${row.slot.enrollment.name} #${row.slot.sessionNumber}`,
    );
    if (!apply) continue;
    await prisma.trainingSessionMaterial.delete({ where: { id: row.id } });
    if (
      row.slot.enrollment.name === "Yogesh Arun Borade" &&
      row.slot.status === "COMPLETED"
    ) {
      await prisma.trainingCourseSlot.update({
        where: { id: row.slotId },
        data: { status: "SCHEDULED" },
      });
      console.log(`    reverted Yogesh #${row.slot.sessionNumber} to SCHEDULED`);
    }
  }

  let created = 0;
  for (const rec of RECORDINGS) {
    const url = driveUrl(rec.id);
    console.log(`\n${rec.title}${rec.both ? "  [Hilal + Samir]" : "  [Samir only]"}`);
    for (const name of rec.students) {
      const enrollment = byName.get(name);
      const session = rec.sessionByName[name];
      const slot = enrollment?.slots.find((item) => item.sessionNumber === session);
      if (!slot) {
        console.log(`  missing slot  ${name} #${session}`);
        continue;
      }
      const already = slot.materials.some(
        (item) => item.kind === "RECORDING" && item.url === url,
      );
      console.log(
        `  ${already ? "exists" : apply ? "add" : "would-add"}  ${name} #${session} (${slot.status})`,
      );
      if (!apply || already) continue;
      await prisma.trainingSessionMaterial.create({
        data: {
          slotId: slot.id,
          kind: "RECORDING",
          title: rec.title,
          url,
        },
      });
      if (rec.complete && slot.status !== "COMPLETED") {
        await prisma.trainingCourseSlot.update({
          where: { id: slot.id },
          data: { status: "COMPLETED" },
        });
        console.log(`    marked COMPLETED`);
      }
      created += 1;
    }
  }

  const sameer = byName.get("Sameer Chakraborty");
  const hilal = byName.get("Mohd Hilal");
  if (sameer && hilal) {
    const groupMeetUrl = "https://meet.google.com/qqp-wfer-fzp";
    const groupLabel = "Hilal + Sameer";
    console.log(
      apply
        ? `\nLink group class ${groupLabel} → ${groupMeetUrl}`
        : `\nWould link group class ${groupLabel} → ${groupMeetUrl}`,
    );
    if (apply) {
      const { randomBytes } = await import("node:crypto");
      const groupKey = `grp_${randomBytes(8).toString("hex")}`;
      await prisma.courseEnrollment.updateMany({
        where: { id: { in: [sameer.id, hilal.id] } },
        data: { groupMeetUrl, groupLabel, groupKey },
      });
      console.log(`  groupKey ${groupKey}`);
    }
  }

  console.log(
    apply
      ? `\nAttached ${created} recordings. Unmapped ${toRemove.length} wrong rows.`
      : `\nDry run. Pass --apply to write.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
