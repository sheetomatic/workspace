"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deletePublicEmployeeDocAction,
  savePublicEmployeeDocsDraftAction,
  submitPublicEmployeeDocsAction,
  uploadPublicEmployeeDocAction,
} from "@/app/hr/docs/actions";

const DOC_TYPE_LABELS: Record<string, string> = {
  EDUCATION_QUALIFICATION: "Education Qualification",
  CV: "CV / Resume",
  WORK_EXPERIENCE: "Work Experience",
  NOC_RESIGNATION: "NOC / Resignation",
  AADHAAR: "Aadhaar",
  PAN: "PAN",
  OFFER_LETTER: "Offer letter",
  CONTRACT: "Contract",
  OTHER: "Other",
};

const REQUIRED_DOC_TYPES = [
  "EDUCATION_QUALIFICATION",
  "CV",
  "WORK_EXPERIENCE",
  "NOC_RESIGNATION",
  "AADHAAR",
  "PAN",
] as const;

type ChecklistItem = {
  docType: string;
  label: string;
  uploaded: boolean;
  documentId: string | null;
};

type DocumentRow = {
  id: string;
  docType: string;
  fileName: string;
  fileSize: number;
};

export function EmployeeDocsPublicForm({
  token,
  organizationName,
  employeeName,
  onboardingStatus,
  educationSummary,
  experienceSummary,
  items,
  documents,
}: {
  token: string;
  organizationName: string;
  employeeName: string;
  onboardingStatus: string;
  educationSummary: string | null;
  experienceSummary: string | null;
  items: ChecklistItem[];
  documents: DocumentRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const submitted = onboardingStatus === "COMPLETE" || onboardingStatus === "SKIPPED";
  const uploadedCount = items.filter((item) => item.uploaded).length;
  const allRequired = items.every((item) => item.uploaded);

  function run(
    action: (formData: FormData) => Promise<{ ok: boolean; message: string }>,
    formData: FormData,
    onOk?: () => void,
  ) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await action(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage(result.message);
      onOk?.();
      router.refresh();
    });
  }

  return (
    <div className="hr-docs-public">
      <header className="hr-docs-public-head">
        <p className="hr-docs-public-kicker">{organizationName}</p>
        <h1>Pending HR documents</h1>
        <p>
          Hello {employeeName}. Upload the required files, save a draft if you need
          more time, then submit when everything is ready.
        </p>
        <span className={submitted ? "hr-docs-pill is-done" : "hr-docs-pill"}>
          {submitted
            ? "Submitted"
            : `${uploadedCount} of ${items.length} uploaded · draft`}
        </span>
      </header>

      {message ? (
        <p className={isError ? "hr-docs-alert is-error" : "hr-docs-alert"} role="status">
          {message}
        </p>
      ) : null}

      <ul className="hr-docs-check">
        {items.map((item) => (
          <li key={item.docType}>
            <span aria-hidden>{item.uploaded ? "✓" : "○"}</span>
            <div>
              <strong>{item.label}</strong>
              <p>{item.uploaded ? "Uploaded" : "Still needed"}</p>
            </div>
          </li>
        ))}
      </ul>

      {documents.length > 0 ? (
        <ul className="hr-docs-files">
          {documents.map((doc) => (
            <li key={doc.id}>
              <div>
                <strong>{DOC_TYPE_LABELS[doc.docType] ?? doc.docType}</strong>
                <p>{doc.fileName}</p>
              </div>
              <div className="hr-docs-file-actions">
                <a
                  href={`/api/hr/docs/${encodeURIComponent(token)}/${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View
                </a>
                {submitted ? null : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      const fd = new FormData();
                      fd.set("token", token);
                      fd.set("documentId", doc.id);
                      run(deletePublicEmployeeDocAction, fd);
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hr-docs-empty">No files uploaded yet.</p>
      )}

      {submitted ? (
        <p className="hr-docs-empty">
          These documents are already submitted. Ask HR if you need to send a new
          link.
        </p>
      ) : (
        <>
          <form
            key={uploadKey}
            className="hr-docs-form"
            action={(formData) => {
              formData.set("token", token);
              run(uploadPublicEmployeeDocAction, formData, () =>
                setUploadKey((key) => key + 1),
              );
            }}
          >
            <label>
              Document type
              <select name="docType" defaultValue="EDUCATION_QUALIFICATION" required>
                {REQUIRED_DOC_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {DOC_TYPE_LABELS[value]}
                  </option>
                ))}
                <option value="OFFER_LETTER">Offer letter</option>
                <option value="CONTRACT">Contract</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label>
              File
              <input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp" />
            </label>
            <button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Upload to draft"}
            </button>
          </form>

          <form
            className="hr-docs-form"
            action={(formData) => {
              formData.set("token", token);
              const intent = String(formData.get("intent") ?? "draft");
              run(
                intent === "submit"
                  ? submitPublicEmployeeDocsAction
                  : savePublicEmployeeDocsDraftAction,
                formData,
              );
            }}
          >
            <label>
              Education summary
              <textarea
                name="educationSummary"
                rows={2}
                defaultValue={educationSummary ?? ""}
                placeholder="Degrees, institutions, year"
              />
            </label>
            <label>
              Work experience summary
              <textarea
                name="experienceSummary"
                rows={2}
                defaultValue={experienceSummary ?? ""}
                placeholder="Prior roles and years"
              />
            </label>
            <div className="hr-docs-actions">
              <button type="submit" name="intent" value="draft" disabled={pending}>
                {pending ? "Saving…" : "Save as draft"}
              </button>
              <button
                type="submit"
                name="intent" value="submit"
                className="is-primary"
                disabled={pending || !allRequired}
              >
                Submit documents
              </button>
            </div>
            {!allRequired ? (
              <p className="hr-docs-hint">
                Submit stays locked until all required documents are uploaded.
              </p>
            ) : null}
          </form>
        </>
      )}
    </div>
  );
}
