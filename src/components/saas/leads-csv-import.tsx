"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { importLeadsFromCsvAction } from "@/app/app/leads/actions";
import { leadsCsvTemplateContent } from "@/lib/leads/csv-import";

export function LeadsCsvImportButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function downloadTemplate() {
    const blob = new Blob([leadsCsvTemplateContent()], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "leads-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="leads-csv-import">
      <button
        type="button"
        className="btn-secondary btn-sm"
        onClick={() => {
          setOpen((value) => !value);
          setMessage(null);
          setError(null);
        }}
      >
        {open ? "Close CSV" : "Import CSV"}
      </button>
      {open ? (
        <div className="leads-csv-import-panel">
          <p className="leads-machine-muted">
            Upload a CSV with phone or email. Download the template for column
            names (status, source, UTM, forecast).
          </p>
          <div className="leads-csv-import-actions">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={downloadTemplate}
            >
              Download template
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              {pending ? "Importing…" : "Choose CSV"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setMessage(null);
                setError(null);
                const formData = new FormData();
                formData.set("file", file);
                startTransition(async () => {
                  const result = await importLeadsFromCsvAction(formData);
                  if (!result.ok) {
                    setError(result.message);
                    return;
                  }
                  setMessage(result.message);
                  router.refresh();
                });
              }}
            />
          </div>
          {message ? (
            <p className="leads-settings-notice is-success">{message}</p>
          ) : null}
          {error ? <p className="leads-settings-error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
