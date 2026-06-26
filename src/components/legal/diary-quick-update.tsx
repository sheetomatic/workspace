"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { LegalCase } from "@prisma/client";
import {
  initialDiaryActionState,
  quickDiaryUpdateAction,
} from "@/app/app/cases/diary-actions";
import { needsPublicationAlert } from "@/lib/legal-cases/intake-fields";

function DiaryQuickRow({ legalCase }: { legalCase: LegalCase }) {
  const [state, action, pending] = useActionState(
    quickDiaryUpdateAction,
    initialDiaryActionState,
  );

  function submit(actionName: string, form: HTMLFormElement) {
    const formData = new FormData(form);
    formData.set("caseId", legalCase.id);
    formData.set("action", actionName);
    action(formData);
  }

  const rowClass = needsPublicationAlert(legalCase.amdCcStatus)
    ? "legal-diary-quick-publication"
    : /\b[BCDE]\b/.test((legalCase.amdCcStatus ?? "").toUpperCase())
      ? "legal-diary-quick-no-show"
      : "";

  return (
    <article className={`legal-diary-quick-card ${rowClass}`.trim()}>
      <header>
        <Link href={`/app/cases/${legalCase.id}?section=2`}>
          <strong>
            {legalCase.fileNumber}
            {legalCase.mccNumber ? ` · ${legalCase.mccNumber}` : ""}
          </strong>
        </Link>
        <span>{legalCase.caseStage ?? legalCase.fileStatus ?? "—"}</span>
      </header>
      <p className="legal-diary-quick-meta">
        {legalCase.applicant ?? "—"} · {legalCase.court ?? "—"} · AMD/CC:{" "}
        {legalCase.amdCcStatus ?? "—"}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit("record_appearance", event.currentTarget);
        }}
      >
        <label>
          Next date
          <input
            defaultValue={legalCase.nextDate ?? ""}
            name="nextDate"
            placeholder="e.g. 25-Jun-26"
          />
        </label>
        <div className="legal-diary-quick-actions">
          <button
            className="btn-cta btn-primary"
            disabled={pending}
            type="submit"
          >
            Done / appearance
          </button>
          <button
            className="btn-cta btn-secondary"
            disabled={pending}
            type="button"
            onClick={(event) => {
              const form = event.currentTarget.closest("form");
              if (form) {
                submit("record_no_show", form);
              }
            }}
          >
            No-show
          </button>
          <button
            className="btn-cta btn-secondary"
            disabled={pending}
            type="button"
            onClick={(event) => {
              const form = event.currentTarget.closest("form");
              if (form) {
                submit("mark_running", form);
              }
            }}
          >
            Running
          </button>
        </div>
      </form>
      {state.message ? (
        <p className={state.ok ? "saas-form-message ok" : "saas-form-message error"}>
          {state.message}
        </p>
      ) : null}
    </article>
  );
}

export function DiaryQuickUpdateList({ items }: { items: LegalCase[] }) {
  if (items.length === 0) {
    return <p className="legal-view-empty">No diary cases to update.</p>;
  }

  return (
    <div className="legal-diary-quick-list">
      {items.map((legalCase) => (
        <DiaryQuickRow key={legalCase.id} legalCase={legalCase} />
      ))}
    </div>
  );
}
