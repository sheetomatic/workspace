export const TEMPLATE_STORE_CATEGORIES = [
  { id: "sheets", label: "Google Sheets Based" },
  { id: "appsheet", label: "AppSheet Based" },
  { id: "cloud", label: "Cloud Softwares" },
] as const;

export type TemplateStoreCategoryId =
  (typeof TEMPLATE_STORE_CATEGORIES)[number]["id"];

export const CLOUD_SOFTWARES_CATEGORY_LABEL = "Cloud Softwares";
export const CLOUD_SOFTWARES_ANCHOR = "cloud-softwares";
export const TEMPLATES_CLOUD_HREF = `/templates?category=cloud#${CLOUD_SOFTWARES_ANCHOR}`;

export function templateTypeToCategory(
  type: "APPSHEET" | "SHEETS" | "EXCEL",
): Exclude<TemplateStoreCategoryId, "cloud"> {
  return type === "APPSHEET" ? "appsheet" : "sheets";
}

export function parseTemplateCategoryParam(
  value: string | null | undefined,
): TemplateStoreCategoryId | "all" {
  if (value === "sheets" || value === "appsheet" || value === "cloud") {
    return value;
  }
  return "all";
}

export function categoryLabel(id: TemplateStoreCategoryId) {
  return (
    TEMPLATE_STORE_CATEGORIES.find((category) => category.id === id)?.label ??
    id
  );
}
