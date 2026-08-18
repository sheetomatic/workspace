import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { prisma } from "../src/lib/db";

function loadEnv() {
  const filePath = join(process.cwd(), ".env.local");
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
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

async function main() {
  loadEnv();
  const enrollments = await prisma.courseEnrollment.findMany({
    where: {
      OR: [
        { name: { contains: "Hilal", mode: "insensitive" } },
        { name: { contains: "Sameer", mode: "insensitive" } },
        { name: { contains: "Samir", mode: "insensitive" } },
        { name: { contains: "Chakraborty", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      meetUrl: true,
      groupMeetUrl: true,
      groupKey: true,
      groupLabel: true,
      slots: {
        orderBy: { sessionNumber: "asc" },
        select: {
          id: true,
          sessionNumber: true,
          status: true,
          startsAt: true,
          title: true,
          meetUrl: true,
          materials: { select: { kind: true, title: true, url: true } },
        },
      },
    },
  });
  for (const row of enrollments) {
    console.log(
      JSON.stringify(
        {
          name: row.name,
          meetUrl: row.meetUrl,
          groupMeetUrl: row.groupMeetUrl,
          groupKey: row.groupKey,
          groupLabel: row.groupLabel,
          slots: row.slots.map((slot) => ({
            n: slot.sessionNumber,
            status: slot.status,
            ist: slot.startsAt.toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            }),
            meetUrl: slot.meetUrl,
            recs: slot.materials.filter((m) => m.kind === "RECORDING"),
          })),
        },
        null,
        2,
      ),
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
