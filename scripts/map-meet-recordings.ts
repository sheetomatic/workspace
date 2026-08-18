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

function istDate(value: Date) {
  return value.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function driveUrl(id: string) {
  return `https://drive.google.com/file/d/${id}/view?usp=sharing`;
}

/** Live class videos in Meet Recordings (qqp-wfer-fzp). Sales calls skipped. */
const CLASS_RECORDINGS = [
  {
    date: "2026-08-18",
    id: "1EVC8lIaQPx8qlWDg1wzK1p34d-Mk8y6K",
    title: "Class recording — 18 Aug 2026",
  },
  {
    date: "2026-08-15",
    id: "1OjHjqoV5iWcBetGvN_Hz9gRa93V8Tvkh",
    title: "Class recording — 15 Aug 2026",
  },
  {
    date: "2026-08-10",
    id: "1o27BBi2XbqeHuHX4bBvISEw1IBZ3ZWmG",
    title: "Class recording — 10 Aug 2026",
  },
  {
    date: "2026-08-08",
    id: "1FcVx6fnpsriZEQ_Xqe4_yJ0e3NZYU5ed",
    title: "Class recording — 8 Aug 2026",
  },
  {
    date: "2026-07-25",
    id: "1E82hbBqmBDzYYGqQzH7XaXLS8NA_cRen",
    title: "Class recording — 25 Jul 2026",
  },
];

async function main() {
  loadEnvFiles();
  const apply = process.argv.includes("--apply");
  const slots = await prisma.trainingCourseSlot.findMany({
    where: {
      startsAt: {
        gte: new Date("2026-07-15T00:00:00.000Z"),
        lte: new Date("2026-08-21T00:00:00.000Z"),
      },
    },
    select: {
      id: true,
      sessionNumber: true,
      status: true,
      startsAt: true,
      enrollment: { select: { name: true } },
      materials: { select: { kind: true, url: true } },
    },
  });

  const byDate = new Map<string, typeof slots>();
  for (const slot of slots) {
    const key = istDate(slot.startsAt);
    const list = byDate.get(key) ?? [];
    list.push(slot);
    byDate.set(key, list);
  }

  let created = 0;
  for (const rec of CLASS_RECORDINGS) {
    const matches = byDate.get(rec.date) ?? [];
    const url = driveUrl(rec.id);
    console.log(`\n${rec.date} ${rec.title}`);
    if (matches.length === 0) {
      console.log("  no slot that day — skipped");
      continue;
    }
    for (const slot of matches) {
      const already = slot.materials.some(
        (item) => item.kind === "RECORDING" && item.url === url,
      );
      console.log(
        `  ${already ? "exists" : apply ? "add" : "would-add"}  #${slot.sessionNumber} ${slot.enrollment.name} (${slot.status})`,
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
      if (slot.status !== "COMPLETED") {
        await prisma.trainingCourseSlot.update({
          where: { id: slot.id },
          data: { status: "COMPLETED" },
        });
      }
      created += 1;
    }
  }

  console.log(apply ? `\nAttached ${created} recordings.` : `\nDry run. Pass --apply to write.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
