import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createEmptyConfig, type AppConfig, type SheetWorkbook } from "@/lib/app-builder";
import { workbookFromClient } from "@/lib/app-builder/workbook-payload";

export type AppBuilderStudioSnapshot = {
  name: string;
  config: AppConfig;
  workbook: SheetWorkbook;
  templateId: string | null;
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "")).filter(Boolean);
}

export function parseAppBuilderConfig(raw: unknown): AppConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Partial<AppConfig> & { meta?: Partial<AppConfig["meta"]> };
  const name = asString(input.meta?.name).trim().slice(0, 80);
  if (!name) return null;
  if (!Array.isArray(input.views) || !Array.isArray(input.related)) return null;
  const empty = createEmptyConfig(name);
  return {
    ...empty,
    ...input,
    meta: {
      ...empty.meta,
      ...(input.meta || {}),
      name,
      version: Number(input.meta?.version) || 1,
      allowedEmails: asStringArray(input.meta?.allowedEmails),
      allowedDomain: asString(input.meta?.allowedDomain).trim() || undefined,
      runAs: input.meta?.runAs === "owner" ? "owner" : input.meta?.runAs === "user" ? "user" : undefined,
    },
    hubs: asStringArray(input.hubs),
    views: input.views,
    related: input.related,
    users: Array.isArray(input.users) ? input.users : empty.users,
    computed: Array.isArray(input.computed) ? input.computed : [],
    visibility: Array.isArray(input.visibility) ? input.visibility : [],
    actions: Array.isArray(input.actions) ? input.actions : [],
    bots: Array.isArray(input.bots) ? input.bots : [],
    intelligence:
      input.intelligence && typeof input.intelligence === "object"
        ? { ...empty.intelligence, ...input.intelligence }
        : empty.intelligence,
  };
}

export function parseAppBuilderStudioInput(raw: {
  config?: unknown;
  workbook?: unknown;
  templateId?: unknown;
}): AppBuilderStudioSnapshot | null {
  const config = parseAppBuilderConfig(raw.config);
  const workbook = workbookFromClient(raw.workbook);
  if (!config || !workbook) return null;
  const templateId =
    typeof raw.templateId === "string" && raw.templateId.trim()
      ? raw.templateId.trim().slice(0, 40)
      : null;
  return { name: config.meta.name, config, workbook, templateId };
}

export async function loadAppBuilderStudio(
  organizationId: string,
): Promise<AppBuilderStudioSnapshot | null> {
  const row = await prisma.appBuilderApp.findUnique({
    where: { organizationId },
  });
  if (!row) return null;
  const parsed = parseAppBuilderStudioInput({
    config: row.config,
    workbook: row.workbook,
    templateId: row.templateId,
  });
  return parsed;
}

export async function saveAppBuilderStudio(
  organizationId: string,
  input: AppBuilderStudioSnapshot,
) {
  const data = {
    name: input.name,
    config: input.config as unknown as Prisma.InputJsonValue,
    workbook: input.workbook as unknown as Prisma.InputJsonValue,
    templateId: input.templateId,
  };
  return prisma.appBuilderApp.upsert({
    where: { organizationId },
    create: { organizationId, ...data },
    update: data,
  });
}
