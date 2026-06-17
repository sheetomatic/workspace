"use client";

import { useState } from "react";

type Tab = "form" | "workflow" | "danger";

export function FmsFormEditorTabs({
  hasWorkflow,
  formSection,
  workflowSection,
  dangerSection,
  defaultTab = "form",
}: {
  hasWorkflow: boolean;
  formSection: React.ReactNode;
  workflowSection: React.ReactNode;
  dangerSection: React.ReactNode;
  defaultTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div className="ws-fms-editor-tabs">
      <div className="ws-fms-editor-tablist" role="tablist" aria-label="Form editor sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "form"}
          className={tab === "form" ? "is-active" : undefined}
          onClick={() => setTab("form")}
        >
          Intake form
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "workflow"}
          className={tab === "workflow" ? "is-active" : undefined}
          onClick={() => setTab("workflow")}
        >
          FMS workflow{hasWorkflow ? "" : " (new)"}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "danger"}
          className={tab === "danger" ? "is-active" : undefined}
          onClick={() => setTab("danger")}
        >
          Delete
        </button>
      </div>

      <div className="ws-fms-editor-tabpanels">
        <div
          role="tabpanel"
          className="ws-fms-editor-panel"
          hidden={tab !== "form"}
        >
          {formSection}
        </div>
        <div
          role="tabpanel"
          className="ws-fms-editor-panel"
          hidden={tab !== "workflow"}
        >
          {workflowSection}
        </div>
        <div
          role="tabpanel"
          className="ws-fms-editor-panel"
          hidden={tab !== "danger"}
        >
          {dangerSection}
        </div>
      </div>
    </div>
  );
}
