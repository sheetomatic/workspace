export const CAMPAIGN_CONTACT_FIELDS = [
  { id: "name", label: "Name" },
  { id: "firstName", label: "First name" },
  { id: "company", label: "Company" },
  { id: "city", label: "City" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "requirement", label: "Requirement" },
  { id: "category", label: "Category" },
] as const;

export type CampaignContactFieldId =
  (typeof CAMPAIGN_CONTACT_FIELDS)[number]["id"];

export type CampaignContactValues = {
  name?: string | null;
  company?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
  requirement?: string | null;
  category?: string | null;
};

export type CampaignVariableMap = Record<string, string>;

export function firstNameFrom(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? "";
}

export function contactFieldValue(
  field: string,
  contact: CampaignContactValues,
): string {
  switch (field) {
    case "name":
      return contact.name?.trim() || "";
    case "firstName":
      return firstNameFrom(contact.name);
    case "company":
      return contact.company?.trim() || "";
    case "city":
      return contact.city?.trim() || "";
    case "email":
      return contact.email?.trim() || "";
    case "phone":
      return contact.phone?.trim() || "";
    case "requirement":
      return contact.requirement?.trim() || "";
    case "category":
      return contact.category?.trim() || "";
    default:
      return "";
  }
}

export function parseVariableMap(value: unknown): CampaignVariableMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: CampaignVariableMap = {};
  for (const [key, mapped] of Object.entries(value as Record<string, unknown>)) {
    if (/^\d+$/.test(key) && typeof mapped === "string" && mapped.trim()) {
      out[key] = mapped.trim();
    }
  }
  return out;
}

export function buildTemplateVariables(
  variableCount: number,
  map: CampaignVariableMap,
  contact: CampaignContactValues,
): string[] {
  const count = Math.max(0, variableCount);
  const vars: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    const field = map[String(i)] || defaultFieldForIndex(i);
    vars.push(contactFieldValue(field, contact));
  }
  return vars;
}

function defaultFieldForIndex(index: number): CampaignContactFieldId {
  if (index === 1) return "name";
  if (index === 2) return "company";
  if (index === 3) return "city";
  return "name";
}

export function campaignStatusLabel(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "QUEUED":
      return "Queued";
    case "RUNNING":
      return "Sending";
    case "PAUSED":
      return "Paused";
    case "COMPLETED":
      return "Completed";
    default:
      return status;
  }
}
