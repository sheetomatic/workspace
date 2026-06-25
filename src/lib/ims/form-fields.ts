export type ImsFormEntity = "ITEM" | "VENDOR";

export type ImsCustomFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "SELECT"
  | "DATE"
  | "CHECKBOX";

export type BuiltinFieldControl =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "checkbox";

export type BuiltinSelectOption = { value: string; label: string };

export type BuiltinFieldDef = {
  key: string;
  defaultLabel: string;
  control: BuiltinFieldControl;
  locked: boolean;
  options?: BuiltinSelectOption[];
  placeholder?: string;
  numberMin?: string;
  numberStep?: string;
};

const ITEM_BUILTINS: BuiltinFieldDef[] = [
  { key: "code", defaultLabel: "Code", control: "text", locked: true, placeholder: "RM-001" },
  { key: "name", defaultLabel: "Name", control: "text", locked: true },
  {
    key: "itemType",
    defaultLabel: "Type",
    control: "select",
    locked: false,
    options: [
      { value: "RAW_MATERIAL", label: "Raw material" },
      { value: "FINISHED_GOOD", label: "Finished good" },
    ],
  },
  { key: "uom", defaultLabel: "UOM", control: "text", locked: false },
  { key: "category", defaultLabel: "Category", control: "text", locked: false },
  {
    key: "abcClass",
    defaultLabel: "ABC class",
    control: "select",
    locked: false,
    options: [
      { value: "A", label: "A" },
      { value: "B", label: "B" },
      { value: "C", label: "C" },
    ],
  },
  { key: "unitCost", defaultLabel: "Unit cost (INR)", control: "number", locked: false, numberMin: "0", numberStep: "any" },
  { key: "minQty", defaultLabel: "Min qty", control: "number", locked: false, numberMin: "0", numberStep: "any" },
  { key: "reorderQty", defaultLabel: "Reorder qty", control: "number", locked: false, numberMin: "0", numberStep: "any" },
  { key: "maxQty", defaultLabel: "Max qty", control: "number", locked: false, numberMin: "0", numberStep: "any" },
  {
    key: "qcOnReceipt",
    defaultLabel: "QC on receipt",
    control: "select",
    locked: false,
    options: [
      { value: "OFF", label: "Off - straight to usable" },
      { value: "OPTIONAL", label: "Optional - ask on receipt" },
      { value: "ALWAYS", label: "Always - QC pending" },
    ],
  },
  { key: "description", defaultLabel: "Description", control: "textarea", locked: false },
  { key: "isActive", defaultLabel: "Active item", control: "checkbox", locked: true },
];

const VENDOR_BUILTINS: BuiltinFieldDef[] = [
  { key: "code", defaultLabel: "Code", control: "text", locked: true, placeholder: "VEN-001" },
  { key: "name", defaultLabel: "Name", control: "text", locked: true },
  { key: "contactName", defaultLabel: "Contact name", control: "text", locked: false },
  { key: "email", defaultLabel: "Email", control: "text", locked: false },
  { key: "phone", defaultLabel: "Phone", control: "text", locked: false },
  { key: "gstin", defaultLabel: "GSTIN", control: "text", locked: false },
  { key: "address", defaultLabel: "Address", control: "textarea", locked: false },
  { key: "paymentTerms", defaultLabel: "Payment terms", control: "text", locked: false },
  { key: "leadTimeDays", defaultLabel: "Lead time (days)", control: "number", locked: false, numberMin: "0", numberStep: "1" },
  { key: "notes", defaultLabel: "Notes", control: "textarea", locked: false },
  { key: "isActive", defaultLabel: "Active vendor", control: "checkbox", locked: true },
];

export function getBuiltinFields(entity: ImsFormEntity): BuiltinFieldDef[] {
  return entity === "VENDOR" ? VENDOR_BUILTINS : ITEM_BUILTINS;
}

export function isBuiltinFieldKey(entity: ImsFormEntity, key: string): boolean {
  return getBuiltinFields(entity).some((field) => field.key === key);
}

/** Derive a stable lowercase slug key from a custom field label. */
export function slugifyFieldKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export type FieldSettingInput = {
  fieldKey: string;
  label: string | null;
  hidden: boolean;
  sortOrder: number;
};

export type CustomFieldInput = {
  key: string;
  label: string;
  fieldType: ImsCustomFieldType;
  options: string[];
  required: boolean;
  helpText: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type FormLayoutBuiltinField = {
  kind: "builtin";
  key: string;
  label: string;
  control: BuiltinFieldControl;
  options: BuiltinSelectOption[];
  locked: boolean;
  placeholder: string | null;
  numberMin: string | null;
  numberStep: string | null;
};

export type FormLayoutCustomField = {
  kind: "custom";
  key: string;
  label: string;
  fieldType: ImsCustomFieldType;
  options: string[];
  required: boolean;
  helpText: string | null;
};

export type FormLayout = {
  entity: ImsFormEntity;
  builtins: FormLayoutBuiltinField[];
  custom: FormLayoutCustomField[];
};

/**
 * Resolve the rendered form layout for an entity by applying admin field
 * settings (rename, hide, reorder) over the built-in registry, then appending
 * active custom fields. Locked fields always render: code/name first and
 * isActive last. Hidden built-in fields are dropped.
 */
export function resolveFormLayout(
  entity: ImsFormEntity,
  fieldSettings: FieldSettingInput[],
  customFields: CustomFieldInput[],
): FormLayout {
  const settingMap = new Map<string, FieldSettingInput>();
  for (const setting of fieldSettings) {
    settingMap.set(setting.fieldKey, setting);
  }

  const builtins = getBuiltinFields(entity);

  const ranked = builtins.map((def, index) => {
    const setting = settingMap.get(def.key);
    const label = setting?.label?.trim() || def.defaultLabel;
    const hidden = def.locked ? false : Boolean(setting?.hidden);

    let sortKey: number;
    if (def.key === "code") {
      sortKey = -1000;
    } else if (def.key === "name") {
      sortKey = -999;
    } else if (def.key === "isActive") {
      sortKey = 100000;
    } else {
      sortKey = setting?.sortOrder ?? index;
    }

    return { def, label, hidden, sortKey, index };
  });

  ranked.sort((a, b) => {
    if (a.sortKey !== b.sortKey) {
      return a.sortKey - b.sortKey;
    }
    return a.index - b.index;
  });

  const resolvedBuiltins: FormLayoutBuiltinField[] = ranked
    .filter((row) => !row.hidden)
    .map((row) => ({
      kind: "builtin" as const,
      key: row.def.key,
      label: row.label,
      control: row.def.control,
      options: row.def.options ?? [],
      locked: row.def.locked,
      placeholder: row.def.placeholder ?? null,
      numberMin: row.def.numberMin ?? null,
      numberStep: row.def.numberStep ?? null,
    }));

  const resolvedCustom: FormLayoutCustomField[] = customFields
    .filter((field) => field.isActive)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((field) => ({
      kind: "custom" as const,
      key: field.key,
      label: field.label,
      fieldType: field.fieldType,
      options: field.options,
      required: field.required,
      helpText: field.helpText,
    }));

  return { entity, builtins: resolvedBuiltins, custom: resolvedCustom };
}
