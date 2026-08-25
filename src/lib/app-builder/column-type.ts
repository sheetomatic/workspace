import type { AppConfig, AppFormField, AppView, CellValue, FieldType } from "./index";
import { fieldFromColumn, inferFieldType } from "./infer";

export const FIELD_TYPE_OPTIONS: { id: FieldType; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "number", label: "Number" },
  { id: "date", label: "Date" },
  { id: "phone", label: "Phone" },
  { id: "email", label: "Email" },
  { id: "choice", label: "Choice" },
  { id: "image", label: "Image" },
];

export function fieldTypeOf(
  view: AppView | undefined,
  col: string,
  values: CellValue[] = [],
): FieldType {
  const field =
    view?.addFields?.find((item) => item.col === col) ||
    view?.editFields?.find((item) => item.col === col);
  return field?.type || inferFieldType(col, values) || "text";
}

function patchFields(
  fields: AppFormField[] | undefined,
  col: string,
  field: AppFormField,
): AppFormField[] {
  return [...(fields || []).filter((item) => item.col !== col), field];
}

export function withColumnType(
  config: AppConfig,
  tab: string,
  col: string,
  type: FieldType,
  values: CellValue[] = [],
): AppConfig {
  const name = col.trim();
  if (!name) return config;
  const field: AppFormField = {
    ...fieldFromColumn(name, values),
    type,
    options: type === "choice" ? fieldFromColumn(name, values).options : undefined,
  };
  return {
    ...config,
    views: config.views.map((view) => {
      if (view.tab !== tab) return view;
      return {
        ...view,
        cols: view.cols.includes(name) ? view.cols : [...view.cols, name],
        addFields: patchFields(view.addFields, name, field),
        editFields: patchFields(view.editFields, name, field),
      };
    }),
  };
}
