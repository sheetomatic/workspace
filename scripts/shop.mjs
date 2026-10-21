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
// Calendar is an explicit release dimension. A generic marketing/Tasks revision
// must never opt into Calendar source, permission checks, or database work.
// PRESERVE_LIVE_CALENDAR reapplies the already-shipped Calendar overlay.
// It does not read Calendar source from the Tasks revision or run migrations.
const calendarRevision = process.env.CALENDAR_RELEASE_REVISION?.trim()
  || (process.env.PRESERVE_LIVE_CALENDAR === "1" ? "908304e81567ed6de223f4914770bdbca1dbfc72" : "");
if (calendarRevision) {
  const calendarFiles = [
    { path: "src/lib/integrations/google-sheets-auth.ts", sha256: "4318b873ab9aed2ec85198fb13f3843930bdfbeb566f9be694013e8aafce9ce8", before: "7518b971b3007e0035adab5ebebee950a6ce0141f286f1921ba56cb781775a0d" },
    { path: "src/lib/leads/calendar-booking-description.ts", sha256: "cc1fb0bb877ad301016a868ec2de6c6b63ace1dcf43efe668b67e9c3bbc914e0" },
    { path: "src/lib/leads/google-calendar-bookings.ts", sha256: "cf597f714171d4cc9139fa73af6078ee5be0043479c799adc8d4a08b9338ce87" },
    { path: "src/app/api/cron/google-calendar-bookings/route.ts", sha256: "6672d0197cd4df904bb59f4464969051eb9af5bb709a8819c7254451f6342c40" },
    { path: "src/app/app/leads/(crm)/meetings/page.tsx", sha256: "b2f7f5c4ed50f2384db1c38694a8bf15cf6692524d1eedcd05b239ad8bc09466", before: "d7bded59f5995c55933849d36038bb040c0f802902734dc2b7c9188866229c69" },
    { path: "src/lib/leads/crm-module-stats.ts", sha256: "97a55f1fda777a2221e205144a81de552b36fff63e8c22df16bd23fadf0d2ea9", before: "416e1b3eb23213bdde18ffa7e6f5e16639ce55513d1a14362d5b2ba067e91612" },
    { path: "src/lib/leads/crm-meetings.ts", sha256: "014ebfd00c2d0861783ce2ba587ac30daa78d4591a8060f8dda4d057629e4e70", before: "b409d9fa71c7d8df9798d7bbc928cd45ef11011b1ed2758176e71a476ba9fdc8" },
    { path: "src/components/saas/crm-meetings-calendar.tsx", sha256: "9620a1fea8a48c2597ebffb493ae6ca8e262c0d4ec44c0c6d13fe1f64bf72d98", before: "44dfee03ee8627f256db08cb798665b22913c67cd3fcb8945b5b72d62307465a" },
    { path: "src/components/saas/crm-meetings-calendar.css", sha256: "f37f41a5f868f1e198d5c930114b047d0c369d8c59f417422b11f95316b1ea23", before: "b7a43c9597edbb5e9535d5d63e200c088657e070c0acc7b25108f61bcb6b8585" },
    { path: "src/lib/content/business-systems-pricing.ts", sha256: "f2a287433d3eaf65837cee6d6557da59f0a39c59d8677e17aeab2948891ddfde", before: "576e57c989acf04cd5b53560d06decf617be9157399d5dd2b1bcae9d302c69ca" },
    { path: "src/lib/content/business-systems-pricing.test.ts", sha256: "5a4c3885a54ab4bb8401ab042561cd660c5a998353d21e1e0c9ec442b958462a", before: "daac8521cdb71859bf85b2920ec56136577666c704c782aea107bf379f040f18" },
    { path: "src/components/marketing/em-ready-pricing.tsx", sha256: "4b6dbfffd6e24bee0432739bec920b5ea591adf6476d0089673809562e9deddf", before: "b5ddf5f4a880184479829a0a1d6e67621002d70def0e0f1f77000b0e8692d091" },
    { path: "src/components/marketing/business-systems-pricing.css", sha256: "ac47d3ddfe52b52ebb94d6b70a2d0f46ae1c233c9c6b8190d92e8904ddf32604", before: "1744c4e99d011490bababc9e9df4b8b7eb435aab022412d59fa0508a7b1a094a" },
    { path: "prisma/migrations/20261020050000_google_calendar_bookings/migration.sql", sha256: "36ce34fe66f24aeed83f257d6cf1f99927a3f271e34f0b8d9f0aca3da955ebc9" },
    { path: "prisma/migrations/20261020060000_google_calendar_booking_details/migration.sql", sha256: "38bad6963e44859f5be2f51072f3f289d7dce7bb96406e486b7b80cfe612e6dc" },
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

  run("npx", ["vitest", "run", "src/lib/content/business-systems-pricing.test.ts"]);

  // Optional permission preflight reads only today's group-calendar events and never writes to Google Calendar.
  if (process.env.CALENDAR_GROUP_PREFLIGHT === "true") {
  const { google } = await import(`${process.cwd()}/node_modules/googleapis/build/src/index.js`);
  const credentials = JSON.parse(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON ?? "{}");
  if (!credentials.client_email || !credentials.private_key) throw new Error("Calendar service account is not configured");
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/calendar.readonly"] });
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = process.env.GOOGLE_APPOINTMENTS_CALENDAR_ID?.trim();
  if (!calendarId) throw new Error("Calendar release preflight is incomplete");
  let events;
  try {
    events = (await calendar.events.list({ calendarId, singleEvents: true,
      timeMin: "2026-10-20T18:30:00.000Z", timeMax: "2026-10-21T18:30:00.000Z",
      maxResults: 100, conferenceDataVersion: 1 })).data.items ?? [];
  } catch (error) {
    if (error?.response?.status === 403 || error?.response?.status === 404) {
      throw new Error(`Calendar ${calendarId} must be shared read-only with ${credentials.client_email}`);
    }
    throw error;
  }
  const titles = (process.env.GOOGLE_APPOINTMENTS_TITLE_PREFIXES ?? "").split("|").map(value => value.trim()).filter(Boolean);
  const meetings = events.filter(event => event.status !== "cancelled" && event.summary &&
    titles.some(title => event.summary === title || event.summary.endsWith(`| ${title}`)));
  const now = Date.now();
  const done = meetings.filter(event => new Date(event.end?.dateTime ?? "").getTime() < now).length;
  const scheduled = meetings.filter(event => new Date(event.end?.dateTime ?? "").getTime() >= now).length;
  if (meetings.length !== 3 || done !== 2 || scheduled !== 1 || meetings.some(event => !event.htmlLink)) {
    throw new Error(`Group Calendar preflight mismatch: ${JSON.stringify({ visibleEvents: events.length,
      matchingMeetings: meetings.length, done, scheduled, summariesVisible: events.filter(event => event.summary).length })}`);
  }
  console.log(`Group Calendar preflight passed: ${JSON.stringify({ matchingMeetings: meetings.length, done, scheduled,
    detailsVisible: true, editLinksVisible: true })}`);
  }
  if (process.env.CALENDAR_MIGRATIONS_ENABLED === "true") {
    run("npx", ["prisma", "db", "execute", "--file", "prisma/migrations/20261020050000_google_calendar_bookings/migration.sql", "--schema", "prisma/schema.prisma"]);
    run("npx", ["prisma", "db", "execute", "--file", "prisma/migrations/20261020060000_google_calendar_booking_details/migration.sql", "--schema", "prisma/schema.prisma"]);
  }
}

// Tasks pricing and checkout. Explicit only, and applied after the production
// Calendar overlay so shared pricing files are checked against that output.
// No Calendar migrations, credentials, or permission checks.
const tasksRevision = process.env.TASKS_RELEASE_REVISION?.trim();
if (tasksRevision) {
  const tasksFiles = [
    { path: "src/lib/content/business-systems-pricing.ts", sha256: "7f836e97c74d2c97b45e2b60c803fb5873daa3a241889ad1fe2dc0dc5e5366c9", before: "f2a287433d3eaf65837cee6d6557da59f0a39c59d8677e17aeab2948891ddfde" },
    { path: "src/lib/content/business-systems-pricing.test.ts", sha256: "6c546b23d36dd890487876349348b26069275ff7584ff38a3ab2dbaabdea54f5", before: "5a4c3885a54ab4bb8401ab042561cd660c5a998353d21e1e0c9ec442b958462a" },
    { path: "src/components/marketing/em-ready-pricing.tsx", sha256: "e759441f7ca16a76c7b3df981292c10a9ef1a619b27d08564d5967e4b0c3cc8e", before: "4b6dbfffd6e24bee0432739bec920b5ea591adf6476d0089673809562e9deddf" },
    { path: "src/components/marketing/business-systems-pricing.css", sha256: "4eae231ef5f1ad0f1680a2cca30f184c3f2d45804cfe63ff0ddc83efa4c622c8", before: "ac47d3ddfe52b52ebb94d6b70a2d0f46ae1c233c9c6b8190d92e8904ddf32604" },
    { path: "src/app/services-content.ts", sha256: "2365457393a94f5d4c07e5ddd622b4889ce306032209993317991e4b36cf0f99", before: "762600f85801d9eccce619eb5e962f6fa7e375dc8605b82ba5bd705ef48eaa4a" },
    { path: "src/app/site-content.ts", sha256: "6ea7e43f34e0b18305d00082e55edfc0e69d718f2644f5ebb20fb8fa15a539ff", before: "b7bc72c9b36e0c046a84bd835d7a08457fe6dc8c980835bd15844fe4a607e95b" },
    { path: "src/lib/templates/checkout.ts", sha256: "cad613a3800c06142caec7d096effce0b9e8e037fd5d0655979a22547527d9b1", before: "1111a87f9c66eff693c4ac3f64822d66657257e47be7dca1297da5a73bf29584" },
    { path: "src/lib/templates/invoice.ts", sha256: "10d26adced569de76ef80e513940b39c16b5dd61b7ab30274030b0f581c93927", before: "6cb162f7429b8c7d2f826f84a22c6f56396f815a14da6f4c2289290ed9444fda" },
    { path: "src/app/api/tasks/checkout/route.ts", sha256: "6c6f632b6bd05a7f90220852792debfc24432ca640c8de1e90bc50c963d32404" },
    { path: "src/components/marketing/tasks-checkout.tsx", sha256: "a9ab4d6d174c92372870182c0d9028a387b7ccae29d1a5d7c6837d5a609c2835" },
    { path: "src/components/marketing/razorpay-checkout-loader.ts", sha256: "a027b2d19b9e7c8426d34698e42485e1d5df283c0743d71eb3a3b5f756311bd8" },
    { path: "src/lib/tasks/checkout-commerce.test.ts", sha256: "3a135b52f7ada576ad094c8bb23ea4b97cedf4c363fd26ddde9de782980d3148" },
    { path: "src/lib/tasks/checkout-commerce.ts", sha256: "c736d83e36ef5a115295f05e1a527955a96632fb1c581232101f5146d1fea00c" },
    { path: "src/lib/tasks/checkout-readiness.ts", sha256: "b3e2d7893d52df1ef8839115c3ee55d59e4f8c20b7955dd079ce25918e13e32b" },
  ];
  const tasksPrepared = await Promise.all(tasksFiles.map(async f => ({
    ...f, bytes: await reviewedAt(tasksRevision, f.path, f.sha256),
  })));
  for (const f of tasksPrepared) {
    let exists = true;
    try {
      const current = await readFile(f.path);
      if (!f.before || digest(current) !== f.before) throw new Error(`Unexpected Tasks release source: ${f.path}`);
    } catch (e) {
      if (e.code === "ENOENT") exists = false; else throw e;
    }
    if (!f.before && exists) throw new Error(`Unexpected existing Tasks file: ${f.path}`);
    if (f.before && !exists) throw new Error(`Missing Tasks release source: ${f.path}`);
  }
  for (const f of tasksPrepared) {
    await mkdir(dirname(f.path), { recursive: true });
    await writeFile(f.path, f.bytes);
  }
  run("npx", ["vitest", "run", "src/lib/content/business-systems-pricing.test.ts"]);
}

run("npm", ["run", "db:generate"]);
run("npx", ["vitest", "run", "src/lib/templates/commerce.test.ts"]);
run("npx", ["vitest", "run", "src/lib/content/business-systems-pricing.test.ts", "src/lib/tasks/checkout-commerce.test.ts"]);
run("npx", ["next", "build"]);
// No seeding, Calendar writes, credential changes, gateway writes or customer messages.
