"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DocumentCategory } from "@/lib/legal-cases/constants";
import { uploadLegalCaseDocument } from "@/app/app/cases/actions";

export function LegalDocumentUploadForm({
  caseId,
  section,
  category,
}: {
  caseId: string;
  section: number;
  category: DocumentCategory;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="legal-upload-form"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await uploadLegalCaseDocument(formData);
          if (!result.ok) {
            setError(result.message);
            return;
          }
          formRef.current?.reset();
          router.refresh();
        });
      }}
    >
      <input name="caseId" type="hidden" value={caseId} />
      <input name="section" type="hidden" value={String(section)} />
      <input name="category" type="hidden" value={category.key} />
      <input
        name="displayName"
        placeholder={`Name this file (e.g. ${category.label} page 1)`}
        required
        type="text"
      />
      <input accept={category.accept} multiple name="files" required type="file" />
      {error ? (
        <p style={{ color: "#dc2626", margin: 0, fontSize: "0.85rem" }}>{error}</p>
      ) : null}
      <button disabled={pending} type="submit">
        {pending ? "Uploading..." : `Upload to ${category.label}`}
      </button>
    </form>
  );
}
