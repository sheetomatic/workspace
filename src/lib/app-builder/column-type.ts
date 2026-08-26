import type { AppConfig, AppFormField, AppView, CellValue, FieldType } from "./index";
import { fieldFromColumn, inferFieldType } from "./infer";

export const FIELD_TYPE_OPTIONS: { id: FieldType; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "number", label: "Number" },
  { id: "date", label: "Date" },
  { id: "enum", label: "Enum (dropdown)" },
  { id: "ref", label: "Ref" },
  { id: "file", label: "File" },
  { id: "image", label: "Image" },
  { id: "phone", label: "Phone" },
  { id: "email", label: "Email" },
  { id: "virtual", label: "Virtual (formula)" },
  { id: "choice", label: "Choice" },
];

export function fieldTypeOf(
  view: AppView | undefined,
  col: string,
  values: CellValue[] = [],
): FieldType {
  const field =
    view?.addFields?.find((item) => item.col === col) ||
    view?.editFields?.find((item) => item.col === col);
  const type = field?.type || inferFieldType(col, values) || "text";
  return type === "choice" ? "enum" : type;
}

export function fieldOf(view: AppView | undefined, col: string): AppFormField | undefined {
  return (
    view?.addFields?.find((item) => item.col === col) ||
    view?.editFields?.find((item) => item.col === col)
  );
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
  extras: Partial<AppFormField> = {},
): AppConfig {
  const name = col.trim();
  if (!name) return config;
  const base = fieldFromColumn(name, values);
  const resolved: FieldType = type === "choice" ? "enum" : type;
  const field: AppFormField = {
    ...base,
    ...extras,
    type: resolved,
    virtual: resolved === "virtual" || extras.virtual,
    options:
      resolved === "enum" || resolved === "choice"
        ? extras.options || base.options
        : extras.options,
  };
  const computed = (config.computed || []).filter(
    (item) => !(item.tab === tab && item.name === name),
  );
  if (resolved === "virtual" && (field.formula || extras.formula)) {
    computed.push({
      id: `${tab}-${name}-formula`,
      tab,
      name,
      kind: "formula",
      formula: field.formula || extras.formula || `[${name}]`,
    });
  }
  return {
    ...config,
    computed,
    views: config.views.map((view) => {
      if (view.tab !== tab) return view;
      return {
        ...view,
        cols: view.cols.includes(name) ? view.cols : [...view.cols, name],
        addFields: field.virtual
          ? (view.addFields || []).filter((item) => item.col !== name)
          : patchFields(view.addFields, name, field),
        editFields: field.virtual
          ? (view.editFields || []).filter((item) => item.col !== name)
          : patchFields(view.editFields, name, field),
      };
    }),
  };
}
