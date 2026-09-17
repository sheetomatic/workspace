"use client";

import { type FmsCaptureField } from "@/lib/fms/constants";
import {
  parseRouteRules,
  type FmsRouteAction,
  type FmsRouteFieldOption,
  type FmsRouteOp,
  type FmsRouteRule,
} from "@/lib/fms/route-rules";

type StepOption = { id: string; stepName: string };

function emptyRule(): FmsRouteRule {
  return {
    when: { source: "completion", fieldKey: "decision", op: "eq", value: "" },
    then: { action: "goto", stepId: "" },
  };
}

function slugKey(label: string) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return slug || "decision";
}

export function FmsRouteRulesEditor({
  steps,
  currentStepId,
  routeRules,
  captureFields,
  intakeFields = [],
  readOnly = false,
  onChange,
}: {
  steps: StepOption[];
  currentStepId: string;
  routeRules: unknown;
  captureFields: FmsCaptureField[];
  intakeFields?: FmsRouteFieldOption[];
  readOnly?: boolean;
  onChange: (patch: {
    routeRules: FmsRouteRule[];
    captureFields: FmsCaptureField[];
  }) => void;
}) {
  const rules = parseRouteRules(routeRules);
  const rule = rules[0] ?? emptyRule();
  const enabled = rules.length > 0;
  const otherSteps = steps.filter((step) => step.id !== currentStepId);
  const nextStep = steps[steps.findIndex((step) => step.id === currentStepId) + 1];
  const decisionField =
    captureFields.find((field) => field.type === "ENUM") ??
    captureFields.find((field) => field.key === rule.when.fieldKey);
  const askAtStop = rule.when.source === "completion";
  const intakeChoices =
    intakeFields.find((field) => field.fieldKey === rule.when.fieldKey)?.choices ??
    [];
  const stopChoices = decisionField?.choices ?? [];
  const valueChoices = askAtStop ? stopChoices : intakeChoices;

  function emit(nextRule: FmsRouteRule | null, nextCapture = captureFields) {
    onChange({
      routeRules: nextRule ? [nextRule] : [],
      captureFields: nextCapture,
    });
  }

  function updateWhen(patch: Partial<FmsRouteRule["when"]>) {
    emit({ ...rule, when: { ...rule.when, ...patch } });
  }

  function updateThen(patch: Partial<FmsRouteRule["then"]>) {
    emit({ ...rule, then: { ...rule.then, ...patch } });
  }

  function setAskAtStop(next: boolean) {
    if (next) {
      setDecisionQuestion(
        decisionField?.label ?? "Decision",
        (decisionField?.choices ?? ["Approve", "Reject"]).join(", "),
      );
      return;
    }
    emit({
      ...rule,
      when: {
        ...rule.when,
        source: "intake",
        fieldKey: intakeFields[0]?.fieldKey || "",
      },
    });
  }

  function setDecisionQuestion(label: string, choicesRaw: string) {
    const key = decisionField?.key || slugKey(label) || "decision";
    const choices = choicesRaw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const nextField: FmsCaptureField = {
      key,
      label: label.trim() || "Decision",
      type: "ENUM",
      required: true,
      choices,
    };
    const nextCapture = [
      nextField,
      ...captureFields.filter((field) => field.key !== key),
    ];
    emit(
      {
        ...rule,
        when: { ...rule.when, source: "completion", fieldKey: key },
      },
      nextCapture,
    );
  }

  return (
    <div className="ws-fms-route-editor">
      <p className="ws-fms-route-editor-kicker">After this step</p>
      <p className="ws-fms-route-editor-default">
        Default next: {nextStep?.stepName.trim() || "Job complete"}
      </p>

      <label className="ws-fms-route-toggle">
        <input
          type="checkbox"
          checked={enabled}
          disabled={readOnly}
          onChange={(event) => {
            if (event.target.checked) {
              const starter = emptyRule();
              starter.then.stepId = otherSteps[0]?.id || nextStep?.id || "";
              const decision: FmsCaptureField = {
                key: "decision",
                label: "Decision",
                type: "ENUM",
                required: true,
                choices: ["Approve", "Reject"],
              };
              emit(starter, [
                decision,
                ...captureFields.filter((field) => field.key !== "decision"),
              ]);
            } else {
              emit(null);
            }
          }}
        />
        If / send-back / skip
      </label>

      {enabled ? (
        <div className="ws-fms-route-card">
          <label className="ws-fms-route-toggle">
            <input
              type="checkbox"
              checked={askAtStop}
              disabled={readOnly}
              onChange={(event) => setAskAtStop(event.target.checked)}
            />
            Ask a choice at this stop
          </label>

          {askAtStop ? (
            <div className="ws-fms-route-grid">
              <label className="ws-fms-flow-field">
                <span className="ws-fms-flow-label">Question</span>
                <input
                  value={decisionField?.label ?? "Decision"}
                  readOnly={readOnly}
                  onChange={(event) =>
                    setDecisionQuestion(
                      event.target.value,
                      (decisionField?.choices ?? ["Approve", "Reject"]).join(", "),
                    )
                  }
                  placeholder="Decision"
                />
              </label>
              <label className="ws-fms-flow-field">
                <span className="ws-fms-flow-label">Choices</span>
                <input
                  value={(decisionField?.choices ?? ["Approve", "Reject"]).join(", ")}
                  readOnly={readOnly}
                  onChange={(event) =>
                    setDecisionQuestion(
                      decisionField?.label ?? "Decision",
                      event.target.value,
                    )
                  }
                  placeholder="Approve, Reject"
                />
              </label>
            </div>
          ) : (
            <label className="ws-fms-flow-field">
              <span className="ws-fms-flow-label">Form field</span>
              {intakeFields.length > 0 ? (
                <select
                  value={rule.when.fieldKey}
                  disabled={readOnly}
                  onChange={(event) => updateWhen({ fieldKey: event.target.value })}
                >
                  <option value="">Select field</option>
                  {intakeFields.map((field) => (
                    <option key={field.fieldKey} value={field.fieldKey}>
                      {field.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={rule.when.fieldKey}
                  readOnly={readOnly}
                  onChange={(event) => updateWhen({ fieldKey: event.target.value })}
                  placeholder="field_key from the intake form"
                />
              )}
            </label>
          )}

          <div className="ws-fms-route-grid">
            <label className="ws-fms-flow-field">
              <span className="ws-fms-flow-label">If it</span>
              <select
                value={rule.when.op}
                disabled={readOnly}
                onChange={(event) =>
                  updateWhen({ op: event.target.value as FmsRouteOp })
                }
              >
                <option value="eq">equals</option>
                <option value="in">is one of</option>
                <option value="truthy">is filled</option>
              </select>
            </label>
            {rule.when.op !== "truthy" ? (
              <label className="ws-fms-flow-field">
                <span className="ws-fms-flow-label">
                  {rule.when.op === "in" ? "Values" : "Value"}
                </span>
                {valueChoices.length > 0 && rule.when.op === "eq" ? (
                  <select
                    value={typeof rule.when.value === "string" ? rule.when.value : ""}
                    disabled={readOnly}
                    onChange={(event) => updateWhen({ value: event.target.value })}
                  >
                    <option value="">Select</option>
                    {valueChoices.map((choice) => (
                      <option key={choice} value={choice}>
                        {choice}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={
                      Array.isArray(rule.when.value)
                        ? rule.when.value.join(", ")
                        : (rule.when.value ?? "")
                    }
                    readOnly={readOnly}
                    onChange={(event) =>
                      updateWhen({
                        value:
                          rule.when.op === "in"
                            ? event.target.value
                            : event.target.value,
                      })
                    }
                    placeholder={rule.when.op === "in" ? "Reject, Rework" : "Reject"}
                  />
                )}
              </label>
            ) : null}
          </div>

          <div className="ws-fms-route-grid">
            <label className="ws-fms-flow-field">
              <span className="ws-fms-flow-label">Then</span>
              <select
                value={rule.then.action}
                disabled={readOnly}
                onChange={(event) =>
                  updateThen({ action: event.target.value as FmsRouteAction })
                }
              >
                <option value="goto">Go to / send back</option>
                <option value="skip">Skip a step</option>
                <option value="complete_job">Finish job</option>
              </select>
            </label>
            {rule.then.action !== "complete_job" ? (
              <label className="ws-fms-flow-field">
                <span className="ws-fms-flow-label">Step</span>
                <select
                  value={rule.then.stepId ?? ""}
                  disabled={readOnly}
                  onChange={(event) => updateThen({ stepId: event.target.value })}
                >
                  <option value="">Select step</option>
                  {otherSteps.map((step) => (
                    <option key={step.id} value={step.id}>
                      {step.stepName.trim() || "Untitled step"}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
