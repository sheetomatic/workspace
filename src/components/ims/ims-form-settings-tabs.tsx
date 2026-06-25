"use client";

import { useState } from "react";
import {
  ImsFormBuilder,
  type CustomFieldRowData,
  type FieldSettingRow,
} from "@/components/ims/ims-form-builder";

type EntityConfig = {
  fieldSettings: FieldSettingRow[];
  customFields: CustomFieldRowData[];
};

export function ImsFormSettingsTabs({
  item,
  vendor,
}: {
  item: EntityConfig;
  vendor: EntityConfig;
}) {
  const [tab, setTab] = useState<"ITEM" | "VENDOR">("ITEM");

  return (
    <div className="ws-ims-settings">
      <div className="ws-ims-toggle ws-ims-settings-tabs">
        <button
          type="button"
          className={tab === "ITEM" ? "is-active" : ""}
          onClick={() => setTab("ITEM")}
        >
          Item form
        </button>
        <button
          type="button"
          className={tab === "VENDOR" ? "is-active" : ""}
          onClick={() => setTab("VENDOR")}
        >
          Vendor form
        </button>
      </div>

      {tab === "ITEM" ? (
        <ImsFormBuilder
          entity="ITEM"
          fieldSettings={item.fieldSettings}
          customFields={item.customFields}
        />
      ) : (
        <ImsFormBuilder
          entity="VENDOR"
          fieldSettings={vendor.fieldSettings}
          customFields={vendor.customFields}
        />
      )}
    </div>
  );
}
