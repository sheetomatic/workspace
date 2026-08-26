"use client";

import { useEffect, useState } from "react";
import type { AppPlan } from "@/lib/app-builder";
import { TEMPLATE_LEAD } from "./app-builder-hero-split";
import { GlidePhonePreview } from "./glide-phone-preview";

type Props = {
  templates: AppPlan[];
  initialId?: string | null;
  onPick?: (plan: AppPlan) => void;
  onFormat?: (plan: AppPlan) => void;
};

export function TemplateNamePicker({
  templates,
  initialId = null,
  onPick,
  onFormat,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const ids = templates.map((plan) => plan.id).join(",");
  const selected = templates.find((plan) => plan.id === selectedId) || null;

  useEffect(() => {
    if (initialId && ids.split(",").includes(initialId)) {
      setSelectedId(initialId);
      return;
    }
    if (selectedId && !ids.split(",").includes(selectedId)) {
      setSelectedId(null);
    }
  }, [initialId, ids, selectedId]);

  return (
    <div className="tpl-name-picker">
      <div className="store-usecases tpl-name-list">
        {templates.map((plan) => (
          <button
            key={plan.id}
            type="button"
            className={selectedId === plan.id ? "on" : ""}
            onClick={() =>
              setSelectedId((current) => (current === plan.id ? null : plan.id))
            }
          >
            {plan.label}
          </button>
        ))}
      </div>
      {selected ? (
        <article className="ab-land-template tpl-name-preview" id={`tpl-${selected.id}`}>
          <GlidePhonePreview plan={selected} />
          <strong>{selected.label}</strong>
          <p>{TEMPLATE_LEAD[selected.id] || selected.blurb}</p>
          <div className="ab-land-actions">
            {onPick ? (
              <button
                type="button"
                className="ab-ios-btn ab-ios-btn-fill"
                onClick={() => onPick(selected)}
              >
                Start
              </button>
            ) : (
              <a className="ab-ios-btn ab-ios-btn-fill" href="/app-builder/signup">
                Get
              </a>
            )}
            {onFormat ? (
              <button
                type="button"
                className="ab-ios-btn ab-ios-btn-tint"
                onClick={() => onFormat(selected)}
              >
                Format
              </button>
            ) : null}
          </div>
        </article>
      ) : (
        <p className="tpl-name-hint">
          Click a name to preview the phone. Then start.
        </p>
      )}
    </div>
  );
}
