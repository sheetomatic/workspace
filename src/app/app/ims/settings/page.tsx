import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsFormSettingsTabs } from "@/components/ims/ims-form-settings-tabs";
import type {
  CustomFieldRowData,
  FieldSettingRow,
} from "@/components/ims/ims-form-builder";
import { requireSession } from "@/lib/require-session";
import { getImsFormConfig } from "@/lib/ims/ims-store";

function toEntityConfig(config: {
  fieldSettings: Array<{
    fieldKey: string;
    label: string | null;
    hidden: boolean;
    sortOrder: number;
  }>;
  customFields: Array<{
    id: string;
    key: string;
    label: string;
    fieldType: CustomFieldRowData["fieldType"];
    options: string[];
    required: boolean;
    helpText: string | null;
    sortOrder: number;
    isActive: boolean;
  }>;
}) {
  const fieldSettings: FieldSettingRow[] = config.fieldSettings.map((s) => ({
    fieldKey: s.fieldKey,
    label: s.label,
    hidden: s.hidden,
    sortOrder: s.sortOrder,
  }));

  const customFields: CustomFieldRowData[] = config.customFields.map((f) => ({
    id: f.id,
    key: f.key,
    label: f.label,
    fieldType: f.fieldType,
    options: f.options,
    required: f.required,
    helpText: f.helpText,
    sortOrder: f.sortOrder,
    isActive: f.isActive,
  }));

  return { fieldSettings, customFields };
}

export default async function ImsFormSettingsPage() {
  const user = await requireSession("MANAGER", { module: "IMS" });

  const [itemConfig, vendorConfig] = await Promise.all([
    getImsFormConfig(user.organizationId, "ITEM"),
    getImsFormConfig(user.organizationId, "VENDOR"),
  ]);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Form settings"
        description="Customise the item and vendor forms: rename, hide, or reorder built-in fields, and add your own custom fields."
      />

      <ImsFormSettingsTabs
        item={toEntityConfig(itemConfig)}
        vendor={toEntityConfig(vendorConfig)}
      />
    </div>
  );
}
