"use client";

import { Trash2 } from "lucide-react";
import type { FmsSlaType } from "@prisma/client";
import {
  FMS_SLA_TYPES,
  FMS_SLA_TYPE_LABELS,
} from "@/lib/fms/constants";
import type { FmsStepDraft } from "@/components/saas/fms-template-builder";

export function FmsStepSettingsPanel({
  step,
  onUpdate,
  onRemove,
  onClose,
  canRemove,
}: {
  step: FmsStepDraft;
  onUpdate: (patch: Partial<FmsStepDraft>) => void;
  onRemove: () => void;
  onClose: () => void;
  canRemove: boolean;
}) {
  return (
    <aside className="ws-fms-jf-props-panel" aria-label="Step settings">
      <header className="ws-fms-jf-props-head">
        <h3>Step settings</h3>
        <button type="button" className="ws-fms-jf-props-close" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="ws-fms-jf-props-body">
        <label className="ws-fms-jf-option-field">
          WHAT (step name)
          <input
            value={step.stepName}
            onChange={(event) => onUpdate({ stepName: event.target.value })}
            placeholder="e.g. Confirmation from buyer"
          />
        </label>

        <label className="ws-fms-jf-option-field">
          WHO (role / team)
          <input
            value={step.roleLabel}
            onChange={(event) => onUpdate({ roleLabel: event.target.value })}
            placeholder="e.g. Shalender Singh"
          />
        </label>

        <label className="ws-fms-jf-option-field">
          WHEN (TAT / SLA type)
          <select
            value={step.slaType}
            onChange={(event) =>
              onUpdate({ slaType: event.target.value as FmsSlaType })
            }
          >
            {FMS_SLA_TYPES.map((type) => (
              <option key={type} value={type}>
                {FMS_SLA_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>

        {(step.slaType === "TAT_CALENDAR_DAYS" ||
          step.slaType === "SPECIFIC_TIME") && (
          <label className="ws-fms-jf-option-field">
            Working days (Mon-Sat, excludes Sun + holidays)
            <input
              type="number"
              min={0}
              value={step.slaDays}
              onChange={(event) => onUpdate({ slaDays: event.target.value })}
            />
          </label>
        )}

        {step.slaType === "TAT_WORKING_HOURS" && (
          <label className="ws-fms-jf-option-field">
            Hours
            <input
              type="number"
              min={1}
              value={step.slaHours}
              onChange={(event) => onUpdate({ slaHours: event.target.value })}
            />
          </label>
        )}

        {step.slaType === "SPECIFIC_TIME" && (
          <div className="ws-fms-jf-step-time-row">
            <label className="ws-fms-jf-option-field">
              Due hour (24h)
              <input
                type="number"
                min={0}
                max={23}
                value={step.atHour}
                onChange={(event) => onUpdate({ atHour: event.target.value })}
              />
            </label>
            <label className="ws-fms-jf-option-field">
              Due minute
              <input
                type="number"
                min={0}
                max={59}
                value={step.atMinute}
                onChange={(event) => onUpdate({ atMinute: event.target.value })}
              />
            </label>
          </div>
        )}

        {step.slaType === "LEAD_TIME_MINUS" && (
          <label className="ws-fms-jf-option-field">
            Days before deadline
            <input
              type="number"
              min={0}
              value={step.minusDays}
              onChange={(event) => onUpdate({ minusDays: event.target.value })}
            />
          </label>
        )}

        <div className="ws-fms-jf-step-checks">
          <label className="ws-fms-jf-option-check">
            <input
              type="checkbox"
              checked={step.allowMarkDone}
              onChange={(event) =>
                onUpdate({ allowMarkDone: event.target.checked })
              }
            />
            Allow mark done
          </label>
          <label className="ws-fms-jf-option-check">
            <input
              type="checkbox"
              checked={step.allowUpload}
              onChange={(event) =>
                onUpdate({ allowUpload: event.target.checked })
              }
            />
            Allow file upload
          </label>
          <label className="ws-fms-jf-option-check">
            <input
              type="checkbox"
              checked={step.allowNotes}
              onChange={(event) =>
                onUpdate({ allowNotes: event.target.checked })
              }
            />
            Allow notes
          </label>
        </div>

        <button
          type="button"
          className="ws-fms-jf-remove"
          onClick={onRemove}
          disabled={!canRemove}
        >
          <Trash2 size={14} aria-hidden />
          Remove step
        </button>
      </div>
    </aside>
  );
}
