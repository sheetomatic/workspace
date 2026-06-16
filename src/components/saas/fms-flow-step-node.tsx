"use client";

import { Trash2 } from "lucide-react";
import type { FmsFlowchartStep } from "@/lib/fms/flow-design";

type Member = { id: string; name: string; email: string };

export function FlowStepNode({
  step,
  index,
  members,
  readOnly,
  onUpdate,
  onRemove,
  canRemove,
}: {
  step: FmsFlowchartStep;
  index: number;
  members: Member[];
  readOnly: boolean;
  onUpdate: (patch: Partial<FmsFlowchartStep>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="ws-fms-flow-node">
      <div className="ws-fms-flow-node-head">
        <span className="ws-fms-flow-node-index">{index + 1}</span>
        <input
          className="ws-fms-flow-node-title"
          value={step.stepName}
          readOnly={readOnly}
          onChange={(event) => onUpdate({ stepName: event.target.value })}
          placeholder={`Step ${index + 1} name`}
          aria-label={`Step ${index + 1} name`}
        />
        {!readOnly && canRemove ? (
          <button
            type="button"
            className="ws-fms-jf-gear ws-fms-jf-trash"
            aria-label="Remove step"
            onClick={onRemove}
          >
            <Trash2 size={16} aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="ws-fms-flow-node-grid">
        <label className="ws-fms-flow-field">
          <span className="ws-fms-flow-label">WHO</span>
          <select
            value={step.ownerUserId}
            disabled={readOnly}
            onChange={(event) => onUpdate({ ownerUserId: event.target.value })}
          >
            <option value="">Select owner...</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className="ws-fms-flow-field ws-fms-flow-field-wide">
          <span className="ws-fms-flow-label">HOW</span>
          <textarea
            rows={2}
            value={step.howInstructions}
            readOnly={readOnly}
            onChange={(event) =>
              onUpdate({ howInstructions: event.target.value })
            }
            placeholder="What should the owner do in this step?"
          />
        </label>

        <label className="ws-fms-flow-field">
          <span className="ws-fms-flow-label">WHEN (TAT)</span>
          <div className="ws-fms-flow-tat-row">
            <input
              type="number"
              min={1}
              value={step.tatValue}
              readOnly={readOnly}
              onChange={(event) => onUpdate({ tatValue: event.target.value })}
              aria-label="TAT value"
            />
            <select
              value={step.tatUnit}
              disabled={readOnly}
              onChange={(event) =>
                onUpdate({
                  tatUnit: event.target.value as "hours" | "days",
                })
              }
              aria-label="TAT unit"
            >
              <option value="days">Days</option>
              <option value="hours">Hours</option>
            </select>
          </div>
        </label>
      </div>
    </div>
  );
}
