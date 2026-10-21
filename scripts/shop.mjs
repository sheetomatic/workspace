/** Preserve the verified live snapshot and add the gated template storefront. No DB writes. */
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

const revision = "4cdd1b6e4ffe51aefcb0c2b7cff9e1075cf36376";
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
async function reviewedAt(sourceRevision, path, expected) {
  const r = await fetch(`https://raw.githubusercontent.com/sheetomatic/workspace/${sourceRevision}/${path}`, { redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`Cannot fetch reviewed source: ${path}`);
  const bytes = Buffer.from(await r.arrayBuffer());
  if (digest(bytes) !== expected) throw new Error(`Source checksum mismatch: ${path}`);
  return bytes;
}
const reviewed = (path, expected) => reviewedAt(revision, path, expected);
function run(command, args) {
  const r = spawnSync(command, args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`Release step failed: ${command}`);
}
if (JSON.parse(await readFile("package.json", "utf8")).name !== "sheetomatic") throw new Error("Wrong project");
if (process.env.TEMPLATE_CHECKOUT_ENABLED === "true") throw new Error("This rollout requires checkout disabled until migration and real gateway tests are verified");
const manifest = JSON.parse(await reviewed("scripts/template-release-files.json", "0aa97f9294424d752b051da0213a198cd6fb62b4f046d15893b048b627a874d1"));
const prepared = await Promise.all(manifest.map(async f => ({ ...f, bytes: await reviewed(f.path, f.sha256) })));
await writeFile("/tmp/preserve-pricing.mjs", prepared.find(f => f.path === "scripts/pricing.mjs").bytes);
run(process.execPath, ["/tmp/preserve-pricing.mjs", "--prepare-only"]);

for (const f of prepared.filter(f => f.path.startsWith("src/"))) {
  if (f.before) {
    if (digest(await readFile(f.path)) !== f.before) throw new Error(`Live source changed: ${f.path}`);
  } else {
    let exists = true;
    try { await access(f.path); } catch (e) { if (e.code === "ENOENT") exists = false; else throw e; }
    if (exists) throw new Error(`Unexpected existing file: ${f.path}`);
  }
}
const schema = await readFile("prisma/schema.prisma", "utf8");
const addition = prepared.find(f => f.path === "prisma/schema.prisma").bytes.toString();
const models = ["TemplateCheckout", "TemplateInvoiceCounter"].map(name => {
  if (schema.includes(`model ${name} {`)) throw new Error(`Existing schema model: ${name}`);
  const model = addition.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))?.[0];
  if (!model) throw new Error(`Reviewed schema model missing: ${name}`);
  return model;
});
for (const f of prepared.filter(f => f.path.startsWith("src/"))) {
  await mkdir(dirname(f.path), { recursive: true });
  await writeFile(f.path, f.bytes);
}
await writeFile("prisma/schema.prisma", `${schema}\n\n${models.join("\n\n")}\n`);

// Optional, checksum-gated legal-page overlay. The deployment command supplies
// the reviewed commit; ordinary template releases retain their previous scope.
const releaseRevision = process.env.RELEASE_REVISION?.trim();
const privacyRevision = process.env.PRIVACY_RELEASE_REVISION?.trim() || releaseRevision;
if (privacyRevision) {
  const privacyPath = "src/app/privacy/page.tsx";
  let privacyExists = true;
  try { await access(privacyPath); } catch (e) { if (e.code === "ENOENT") privacyExists = false; else throw e; }
  if (privacyExists) throw new Error(`Unexpected existing file: ${privacyPath}`);
  const privacyPage = await reviewedAt(
    privacyRevision,
    privacyPath,
    "d5cf3eb793bb4ef5b64d68e7f3e933a554d69349c75304ad3a1c5c4877d7d1a3",
  );
  await mkdir(dirname(privacyPath), { recursive: true });
  await writeFile(privacyPath, privacyPage);

  const legalNavBefore = `          <nav aria-label="Legal" className="site-footer-legal-links">\n            <Link href="/terms">Terms &amp; Conditions</Link>\n          </nav>`;
  const legalNavAfter = `          <nav aria-label="Legal" className="site-footer-legal-links">\n            <Link href="/privacy">Privacy Policy</Link>\n            <Link href="/terms">Terms &amp; Conditions</Link>\n          </nav>`;
  for (const path of [
    "src/app/components.tsx",
    "src/components/marketing/ai-site-chrome.tsx",
  ]) {
    const source = await readFile(path, "utf8");
    const occurrences = source.split(legalNavBefore).length - 1;
    if (occurrences !== 1) throw new Error(`Unexpected legal nav source: ${path}`);
    await writeFile(path, source.replace(legalNavBefore, legalNavAfter));
  }
}

// Optional Calendar → CRM Meetings overlay. This keeps the verified storefront
// release intact and adds only the read-only booking mirror.
const calendarRevision = process.env.CALENDAR_RELEASE_REVISION?.trim() || releaseRevision;
if (calendarRevision) {
  const calendarFiles = [
    { path: "src/lib/integrations/google-sheets-auth.ts", sha256: "4318b873ab9aed2ec85198fb13f3843930bdfbeb566f9be694013e8aafce9ce8", before: "7518b971b3007e0035adab5ebebee950a6ce0141f286f1921ba56cb781775a0d" },
    { path: "src/lib/leads/calendar-booking-description.ts", sha256: "cc1fb0bb877ad301016a868ec2de6c6b63ace1dcf43efe668b67e9c3bbc914e0" },
    { path: "src/lib/leads/google-calendar-bookings.ts", sha256: "46fa00248dd725898dc900afc1ff2a6b6bb3f2b2d8f84b5f715e2c4421886203" },
    { path: "src/app/api/cron/google-calendar-bookings/route.ts", sha256: "6672d0197cd4df904bb59f4464969051eb9af5bb709a8819c7254451f6342c40" },
    { path: "src/app/app/leads/(crm)/meetings/page.tsx", sha256: "b6b6fa0ebecaaa33be826c072627cd2a77fbc48dc794f012b95f8786cffb4dbf", before: "d7bded59f5995c55933849d36038bb040c0f802902734dc2b7c9188866229c69" },
    { path: "src/lib/leads/crm-module-stats.ts", sha256: "2280e5d3c1eae00625b0cd202988848c1093f6c5234f670e1eecf0a7a9c42fff", before: "416e1b3eb23213bdde18ffa7e6f5e16639ce55513d1a14362d5b2ba067e91612" },
    { path: "src/lib/leads/crm-meetings.ts", sha256: "b0b7a2fe57d2980cf2d13d9ee3f1e8e680f7c8d153f65d48f7d735ea38eef265", before: "b409d9fa71c7d8df9798d7bbc928cd45ef11011b1ed2758176e71a476ba9fdc8" },
    { path: "src/components/saas/crm-meetings-calendar.tsx", sha256: "bd50b07fbbd74471d5780e149869edecce989509adce705e1ca6e2eec87f6451", before: "44dfee03ee8627f256db08cb798665b22913c67cd3fcb8945b5b72d62307465a" },
    { path: "src/components/saas/crm-meetings-calendar.css", sha256: "f37f41a5f868f1e198d5c930114b047d0c369d8c59f417422b11f95316b1ea23", before: "b7a43c9597edbb5e9535d5d63e200c088657e070c0acc7b25108f61bcb6b8585" },
    { path: "prisma/migrations/20261020050000_google_calendar_bookings/migration.sql", sha256: "fee07e0a0e15fb84e99e97af1327caaa2cc8ad2e9cb8b1fe6fae11bc11ed2ec5" },
    { path: "prisma/migrations/20261020060000_google_calendar_booking_details/migration.sql", sha256: "bc65db0b5d34f1ec441f658a3526f834c3f6faa95ab34f7eceddf4830627189d" },
  ];
  const calendarPrepared = await Promise.all(calendarFiles.map(async f => ({
    ...f, bytes: await reviewedAt(calendarRevision, f.path, f.sha256),
  })));
  for (const f of calendarPrepared) {
    let exists = true;
    try {
      const current = await readFile(f.path);
      if (!f.before || digest(current) !== f.before) throw new Error(`Unexpected Calendar release source: ${f.path}`);
    } catch (e) {
      if (e.code === "ENOENT") exists = false; else throw e;
    }
    if (!f.before && exists) throw new Error(`Unexpected existing Calendar file: ${f.path}`);
    if (f.before && !exists) throw new Error(`Missing Calendar release source: ${f.path}`);
  }

  const reviewedSchema = (await reviewedAt(calendarRevision, "prisma/schema.prisma", "e111213faa18f5aa9ac52354219a9b2570ac21ffdd3a026c7e1d0aeab81e03c3")).toString();
  let calendarSchema = await readFile("prisma/schema.prisma", "utf8");
  const relationBefore = "  memberships     Membership[]";
  const relationAfter = `${relationBefore}\n  googleCalendarConnections GoogleCalendarConnection[]`;
  if (calendarSchema.split(relationBefore).length - 1 !== 1 || calendarSchema.includes("googleCalendarConnections GoogleCalendarConnection[]")) {
    throw new Error("Unexpected Organization schema for Calendar release");
  }
  calendarSchema = calendarSchema.replace(relationBefore, relationAfter);
  const calendarModels = ["GoogleCalendarConnection", "GoogleCalendarBooking"].map(name => {
    if (calendarSchema.includes(`model ${name} {`)) throw new Error(`Existing Calendar schema model: ${name}`);
    const model = reviewedSchema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`))?.[0];
    if (!model) throw new Error(`Reviewed Calendar schema model missing: ${name}`);
    return model;
  });
  await writeFile("prisma/schema.prisma", `${calendarSchema}\n\n${calendarModels.join("\n\n")}\n`);
  for (const f of calendarPrepared) {
    await mkdir(dirname(f.path), { recursive: true });
    await writeFile(f.path, f.bytes);
  }

  const vercelPath = "vercel.json";
  const vercelSource = await readFile(vercelPath);
  const reviewedVercel = await reviewedAt(
    "5aa4579a6c17b30a0dce8ed192d5234b19bf4f04",
    vercelPath,
    "36201613bd5b91a379975fef98330a9f2291d6a72f1b3ee2c96660b8acae504d",
  );
  const vercel = JSON.parse(vercelSource);
  const expectedVercel = JSON.parse(reviewedVercel);
  const preservesCrons = expectedVercel.crons.every(expected =>
    vercel.crons?.some(current => current.path === expected.path && current.schedule === expected.schedule));
  const preservesFunctions = Object.entries(expectedVercel.functions).every(([path, expected]) =>
    JSON.stringify(vercel.functions?.[path]) === JSON.stringify(expected));
  if (!preservesCrons || !preservesFunctions) {
    throw new Error("Unexpected vercel.json for Calendar release");
  }
  if (vercel.crons.some(item => item.path === "/api/cron/google-calendar-bookings")) throw new Error("Calendar cron already exists");
  vercel.crons.unshift({ path: "/api/cron/google-calendar-bookings", schedule: "*/5 * * * *" });
  await writeFile(vercelPath, `${JSON.stringify(vercel, null, 2)}\n`);

  // Permission preflight runs before the additive migration. It reads only the
  // one event specified by this release and never writes to Google Calendar.
  const { google } = await import(`${process.cwd()}/node_modules/googleapis/build/src/index.js`);
  const credentials = JSON.parse(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON ?? "{}");
  if (!credentials.client_email || !credentials.private_key) throw new Error("Calendar service account is not configured");
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/calendar.readonly"] });
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = process.env.GOOGLE_APPOINTMENTS_CALENDAR_ID?.trim();
  const eventId = process.env.CALENDAR_RELEASE_EVENT_ID?.trim() || "h130ejrtefpls9up2ob3nku9p4";
  if (!calendarId || !eventId) throw new Error("Calendar release preflight is incomplete");
  let event;
  try {
    event = (await calendar.events.get({ calendarId, eventId })).data;
  } catch (error) {
    if (error?.response?.status === 404) {
      throw new Error(`Calendar ${calendarId} must be shared read-only with ${credentials.client_email}`);
    }
    throw error;
  }
  const expectedStart = new Date("2026-10-21T12:30:00+05:30").getTime();
  const expectedEnd = new Date("2026-10-21T13:00:00+05:30").getTime();
  if (event.id !== eventId || event.status === "cancelled" ||
      new Date(event.start?.dateTime ?? "").getTime() !== expectedStart ||
      new Date(event.end?.dateTime ?? "").getTime() !== expectedEnd ||
      event.hangoutLink !== "https://meet.google.com/mzm-cske-fpn") {
    throw new Error(`Calendar event preflight mismatch: ${JSON.stringify({ id: event.id, status: event.status,
      start: event.start?.dateTime, end: event.end?.dateTime, meetUrl: event.hangoutLink ?? null })}`);
  }
  console.log("Calendar permission and Bhaskar event preflight passed");
  run("npx", ["prisma", "migrate", "deploy"]);
}
run("npm", ["run", "db:generate"]);
run("npx", ["vitest", "run", "src/lib/templates/commerce.test.ts"]);
run("npx", ["next", "build"]);
// No seeding, Calendar writes, credential changes, gateway writes or customer messages.
