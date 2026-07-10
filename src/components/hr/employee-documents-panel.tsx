"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteEmployeeDocumentAction,
  uploadEmployeeDocumentAction,
} from "@/lib/hr/hr-actions";

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

type DocRow = {
  id: string;
  docType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date | string;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function EmployeeDocumentsPanel({
  employeeProfileId,
  documents,
  canEdit,
}: {
  employeeProfileId: string | null;
  documents: DocRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  if (!employeeProfileId) {
    return (
      <section className="ws-hr-form-section">
        <h3>Documents</h3>
        <p className="ws-hr-note">
          Save the employee profile first, then upload Aadhaar, PAN, offer letter, or
          contract (max 8 MB).
        </p>
      </section>
    );
  }

  function onUpload(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await uploadEmployeeDocumentAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Document uploaded.");
      router.refresh();
    });
  }

  function onDelete(documentId: string) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const fd = new FormData();
      fd.set("documentId", documentId);
      const result = await deleteEmployeeDocumentAction(fd);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Document removed.");
      router.refresh();
    });
  }

  return (
    <section className="ws-hr-form-section">
      <h3>Documents</h3>
      <p className="ws-hr-help">
        Required on join: Education, CV, Work Experience, NOC/Resignation,
        Aadhaar, PAN. Optional: offer letter and contract.
      </p>

      {documents.length > 0 ? (
        <ul className="ws-hr-doc-list">
          {documents.map((doc) => (
            <li key={doc.id} className="ws-hr-doc-item">
              <div>
                <strong>{DOC_TYPE_LABELS[doc.docType] ?? doc.docType}</strong>
                <div className="ws-apple-cell-secondary">
                  {doc.fileName} · {formatBytes(doc.fileSize)}
                </div>
              </div>
              <div className="ws-hr-doc-actions">
                <a
                  className="btn-secondary btn-sm"
                  href={`/api/hr/employee-documents/${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download
                </a>
                {canEdit ? (
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={pending}
                    onClick={() => onDelete(doc.id)}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ws-hr-note">No documents uploaded yet.</p>
      )}

      {canEdit ? (
        <form action={onUpload} className="ws-hr-form ws-hr-doc-upload">
          <input type="hidden" name="employeeProfileId" value={employeeProfileId} />
          <label>
            Type
            <select name="docType" defaultValue="EDUCATION_QUALIFICATION" required>
              <optgroup label="Required">
                {REQUIRED_DOC_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {DOC_TYPE_LABELS[value]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Optional">
                {(["OFFER_LETTER", "CONTRACT", "OTHER"] as const).map((value) => (
                  <option key={value} value={value}>
                    {DOC_TYPE_LABELS[value]}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label>
            File
            <input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp" />
          </label>
          <button type="submit" className="btn-cta btn-primary" disabled={pending}>
            {pending ? "Uploading…" : "Upload document"}
          </button>
        </form>
      ) : null}

      {message ? (
        <p
          className={isError ? "ws-hr-feedback-error" : "ws-hr-feedback"}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
