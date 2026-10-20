/** Narrow, transactional migration runner. Never runs other pending migrations. */
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
const local = process.argv.includes("--local-test");
const apply = process.argv.includes("--apply");
const target = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!target) throw new Error("Database binding missing");
const url = new URL(target);
if (local) {
  if (url.hostname !== "127.0.0.1" || url.port !== "55439" || url.pathname !== "/template_hosted_migration_test") throw new Error("Not the isolated migration test database");
} else {
  if (process.env.VERCEL_ENV !== "production" || !url.hostname.endsWith(".neon.tech")) throw new Error("Unverified deployment/database target");
  if (process.env.VERCEL_PROJECT_ID && process.env.VERCEL_PROJECT_ID !== "prj_E2G99Y1UGVVQ7SXqmJQfVKjzy2yt") throw new Error("Wrong Vercel project");
}
const prisma = new PrismaClient({ datasources: { db: { url: target } } });
const names = ["20261020060000_template_checkout", "20261020120000_template_hosted_checkout"];
try {
  if (!local) {
    const orgs = await prisma.organization.findMany({ where: { isPrimary: true }, select: { slug: true, name: true, quotationAccount: true } });
    if (orgs.length !== 1 || orgs[0].slug !== "sheetomatic-technologies") throw new Error("Primary seller identity is not the verified Sheetomatic workspace");
    const products = await prisma.templateProduct.count({ where: { active: true } });
    if (products < 5) throw new Error("Expected template catalogue not found");
    console.log(`Verified Sheetomatic database on ${url.hostname}; active catalogue: ${products}; saved tax profile: ${Boolean(orgs[0].quotationAccount)}.`);
  }
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261020, 60000)`;
    for (const name of names) {
      const sql = await readFile(`prisma/migrations/${name}/migration.sql`, "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const existing = await tx.$queryRaw`SELECT checksum, finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name = ${name}`;
      if (existing.length) {
        if (existing.length !== 1 || existing[0].checksum !== checksum || !existing[0].finished_at || existing[0].rolled_back_at) throw new Error(`Migration conflict: ${name}`);
        console.log(`Already applied: ${name}`);
        continue;
      }
      if (!apply) { console.log(`Pending scoped additive migration: ${name}`); continue; }
      // These two checked-in files contain simple DDL only, no procedural bodies or user input.
      for (const statement of sql.split(";").filter(s => s.replace(/--[^\n]*/g, "").trim())) await tx.$executeRawUnsafe(statement);
      await tx.$executeRaw`INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count) VALUES (${randomUUID()}, ${checksum}, NOW(), ${name}, NOW(), 1)`;
      console.log(`Applied scoped additive migration: ${name}`);
    }
  }, { timeout: 30000 });
  if (apply) {
    await prisma.templateCheckout.count();
    await prisma.templateInvoiceCounter.count();
    console.log("Template checkout schema verified. No products, customers or legacy orders modified.");
  }
} finally { await prisma.$disconnect(); }
