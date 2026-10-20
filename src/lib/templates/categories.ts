export const TEMPLATE_STORE_CATEGORIES = [
  { id: "sheets", label: "Google Sheets Based" },
  { id: "appsheet", label: "AppSheet Based" },
] as const;

export type TemplateStoreCategoryId =
  (typeof TEMPLATE_STORE_CATEGORIES)[number]["id"];

export const CLOUD_SOFTWARES_CATEGORY_LABEL = "Cloud Softwares";
export const CLOUD_SOFTWARES_ANCHOR = "cloud-softwares";
/** Legacy hosted-software entry points now lead to Suite plans. */
export const TEMPLATES_CLOUD_HREF = "/pricing";

export function templateTypeToCategory(
  type: "APPSHEET" | "SHEETS" | "EXCEL",
): TemplateStoreCategoryId {
  return type === "APPSHEET" ? "appsheet" : "sheets";
}

export function parseTemplateCategoryParam(
  value: string | null | undefined,
): TemplateStoreCategoryId | "all" {
  if (value === "sheets" || value === "appsheet") {
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
