import type { CellValue, SheetRow } from "./index";
import { evaluateAppSheetFormula } from "./appsheet-formula";
import { pdfBase64, renderTextPdf } from "./pdf";

export type BotEventKind =
  | "adds"
  | "updates"
  | "deletes"
  | "adds_or_updates"
  | "schedule"
  | "manual";

export type BotTaskKind = "email" | "whatsapp" | "pdf" | "script";

export interface AppBotTask {
  id: string;
  kind: BotTaskKind;
  to?: string;
  subject?: string;
  body?: string;
  folder?: string;
  fileName?: string;
  script?: string;
}

export interface AppBot {
  id: string;
  name: string;
  enabled: boolean;
  table: string;
  event: BotEventKind;
  /** AppSheet Adds / Updates / Deletes. When set, overrides event for data changes. */
  changes?: { adds?: boolean; updates?: boolean; deletes?: boolean };
  condition?: string;
  tasks: AppBotTask[];
}

export interface AppIntelligence {
  voiceEnabled?: boolean;
  aiFormulas?: boolean;
  voiceHint?: string;
}

export type PlannedBotAction = {
  kind: "email" | "whatsapp" | "pdf" | "log";
  to?: string;
  subject?: string;
  body?: string;
  folder?: string;
  fileName?: string;
  pdfBase64?: string;
  message: string;
};

function asText(value: CellValue) {
  return value == null ? "" : String(value);
}

function cellOf(row: Record<string, CellValue>, name: string): CellValue {
  if (name in row) return row[name];
  const want = name.trim().toLowerCase();
  const hit = Object.keys(row).find((key) => key.toLowerCase() === want);
  return hit ? row[hit] : "";
}

/** AppSheet <<[Col]>> and [Col] substitution. */
export function interpolateTemplate(
  template: string,
  row: Record<string, CellValue>,
): string {
  return template.replace(/<<\[([^\]]+)\]>>|\[([^\]]+)\]/g, (_, a, b) =>
    asText(cellOf(row, String(a || b))),
  );
}

export function botsForEvent(
  bots: AppBot[] | undefined,
  table: string,
  event: "adds" | "updates" | "deletes" | "manual",
): AppBot[] {
  return (bots || []).filter((bot) => {
    if (!bot.enabled) return false;
    if (bot.table !== table) return false;
    if (bot.event === "manual" || bot.event === "schedule") {
      return event === "manual";
    }
    if (bot.changes) {
      if (event === "adds") return bot.changes.adds !== false;
      if (event === "updates") return bot.changes.updates !== false;
      if (event === "deletes") return Boolean(bot.changes.deletes);
      return false;
    }
    if (bot.event === "adds_or_updates") {
      return event === "adds" || event === "updates";
    }
    return bot.event === event;
  });
}

export function conditionPasses(
  condition: string | undefined,
  row: Record<string, CellValue>,
): boolean {
  const formula = condition?.trim();
  if (!formula) return true;
  try {
    return Boolean(evaluateAppSheetFormula(formula, { row }));
  } catch {
    return false;
  }
}

const EMAIL_RE =
  /^SEND_EMAIL\s+to\s+(.+?)\s+subject\s+"([^"]*)"\s+body\s+"([^"]*)"\s*$/i;
const WA_RE = /^SEND_WA\s+to\s+(.+?)\s+"([^"]*)"\s*$/i;
const PDF_RE =
  /^CREATE_PDF\s+folder\s+"([^"]*)"\s+file\s+"([^"]*)"(?:\s+body\s+"([^"]*)")?\s*$/i;

export function parseBotScript(
  source: string,
  row: Record<string, CellValue>,
): PlannedBotAction[] {
  const out: PlannedBotAction[] = [];
  for (const raw of source.split(/\n|;/)) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;
    const email = line.match(EMAIL_RE);
    if (email) {
      const to = interpolateTemplate(email[1].trim(), row);
      const subject = interpolateTemplate(email[2], row);
      const body = interpolateTemplate(email[3], row);
      out.push({
        kind: "email",
        to,
        subject,
        body,
        message: `Email → ${to}: ${subject}`,
      });
      continue;
    }
    const wa = line.match(WA_RE);
    if (wa) {
      const to = interpolateTemplate(wa[1].trim(), row);
      const body = interpolateTemplate(wa[2], row);
      out.push({
        kind: "whatsapp",
        to,
        body,
        message: `WhatsApp → ${to}`,
      });
      continue;
    }
    const pdf = line.match(PDF_RE);
    if (pdf) {
      const folder = interpolateTemplate(pdf[1], row);
      const fileName = interpolateTemplate(pdf[2], row);
      const body = interpolateTemplate(pdf[3] || "", row);
      out.push(planPdf(folder, fileName, body, row));
      continue;
    }
    out.push({
      kind: "log",
      message: `Unknown script line: ${line.slice(0, 80)}`,
    });
  }
  return out;
}

function planPdf(
  folder: string,
  fileName: string,
  body: string,
  row: Record<string, CellValue>,
): PlannedBotAction {
  const lines = [
    folder ? `Folder: ${folder}` : "",
    ...Object.entries(row).map(([key, value]) => `${key}: ${asText(value)}`),
    ...(body ? body.split(/\n/) : []),
  ].filter(Boolean);
  const bytes = renderTextPdf(fileName.replace(/\.pdf$/i, "") || "Document", lines);
  return {
    kind: "pdf",
    folder,
    fileName: fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`,
    body,
    pdfBase64: pdfBase64(bytes),
    message: `PDF ${folder ? `${folder}/` : ""}${fileName}`,
  };
}

export function planBotTasks(
  bot: AppBot,
  row: Record<string, CellValue> | SheetRow["cells"],
): PlannedBotAction[] {
  if (!conditionPasses(bot.condition, row)) return [];
  const planned: PlannedBotAction[] = [];
  for (const task of bot.tasks) {
    if (task.kind === "script") {
      planned.push(...parseBotScript(task.script || "", row));
      continue;
    }
    const to = interpolateTemplate(task.to || "", row);
    const subject = interpolateTemplate(task.subject || bot.name, row);
    const body = interpolateTemplate(task.body || "", row);
    const folder = interpolateTemplate(task.folder || "", row);
    const fileName = interpolateTemplate(task.fileName || `${bot.name}.pdf`, row);
    if (task.kind === "email") {
      planned.push({
        kind: "email",
        to,
        subject,
        body,
        message: `Email → ${to || "(missing address)"}: ${subject}`,
      });
    } else if (task.kind === "whatsapp") {
      planned.push({
        kind: "whatsapp",
        to,
        body,
        message: `WhatsApp → ${to || "(missing phone)"}`,
      });
    } else {
      planned.push(planPdf(folder, fileName, body, row));
    }
  }
  return planned;
}

export function planBotsForRow(
  bots: AppBot[] | undefined,
  table: string,
  event: "adds" | "updates" | "deletes" | "manual",
  row: Record<string, CellValue>,
): PlannedBotAction[] {
  return botsForEvent(bots, table, event).flatMap((bot) => planBotTasks(bot, row));
}

export const SCRIPT_HELP = `SEND_EMAIL to [Email] subject "Quote for [Name]" body "Hi [Name], value [Value]"
SEND_WA to [Phone] "Hi [Name], we will call you about [Company]"
CREATE_PDF folder "Quotes/[Company]" file "[Name] quote.pdf" body "Quote for [Name]"`;
