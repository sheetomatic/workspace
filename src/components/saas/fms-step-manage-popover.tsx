"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import {
  FmsStepInfoModal,
  type FmsStepManageMeta,
} from "@/components/saas/fms-step-info-modal";

export type { FmsStepManageMeta };

export function FmsStepManagePopover({
  meta,
  compact = false,
  showEditLink = true,
  editHref,
}: {
  meta: FmsStepManageMeta;
  compact?: boolean;
  showEditLink?: boolean;
  editHref?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`ws-fms-step-manage-btn${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-label={`Step details: ${meta.stepName}`}
        onClick={() => setOpen(true)}
      >
        <Settings2 size={compact ? 14 : 16} aria-hidden />
        {!compact ? <span>Manage</span> : null}
      </button>
      <FmsStepInfoModal
        meta={meta}
        open={open}
        onClose={() => setOpen(false)}
        editHref={
          showEditLink
            ? (editHref ?? `/app/fms/forms/${meta.formId}?from=setup`)
            : undefined
        }
      />
    </>
  );
}
