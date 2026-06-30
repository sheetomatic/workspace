"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import {
  checklistInitialState,
  importChecklistTemplatesAction,
} from "@/app/app/checklists/actions";
import {
  TEMPLATE_IMPORT_TEMPLATE_HEADERS,
  TEMPLATE_IMPORT_TEMPLATE_SAMPLE,
} from "@/lib/checklists/template-import";

type ParsedRow = {
  rowNumber: number;
  data: {
    title: string;
    instructions: string | null;
    team: string;
    frequency: string;
    dueHour: number;
    dueMinute: number;
    assigneeEmail: string;
    references: string[];
    isActive: boolean;
  };
  valid: boolean;
  errors: string[];
};

type ParseResponse = {
  rows?: ParsedRow[];
  summary?: { total: number; valid: number; invalid: number };
  error?: string;
};

function downloadTemplate() {
  const csv = [
    TEMPLATE_IMPORT_TEMPLATE_HEADERS.join(","),
    TEMPLATE_IMPORT_TEMPLATE_SAMPLE.join(","),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "checklist-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ChecklistImport() {
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [summary, setSummary] = useState<ParseResponse["summary"] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, action] = useActionState(importChecklistTemplatesAction, checklistInitialState);

  function reset() {
    setRows([]);
    setSummary(null);
    setParseError("");
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setParsing(true);
    setParseError("");
    setRows([]);
    setSummary(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/checklists/import/templates", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as ParseResponse;
      if (!res.ok) {
        setParseError(data.error ?? "Could not parse the file.");
        return;
      }
      setRows(data.rows ?? []);
      setSummary(data.summary ?? null);
    } catch {
      setParseError("Network error while parsing the file.");
    } finally {
      setParsing(false);
    }
  }

  const validRows = rows.filter((row) => row.valid).map((row) => row.data);
  const rowsPayload = JSON.stringify(validRows);

  return (
    <section className="ws-sf-list-view ws-checklist-import">
      <header className="ws-sf-list-view-header">
        <div className="ws-sf-list-view-title">
          <h2>Bulk import</h2>
        </div>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => {
            setOpen((value) => !value);
            if (open) {
              reset();
            }
          }}
        >
          {open ? "Close" : "Import from CSV"}
        </button>
      </header>

      {open ? (
        <div className="ws-checklist-import-body">
          <p className="ws-em-section-lead">
            Upload a CSV to create many checklist templates at once. Download the
            format file for the required columns.
          </p>

          <div className="ws-checklist-import-controls">
            <button type="button" className="btn-secondary btn-sm" onClick={downloadTemplate}>
              Download format CSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleFile}
            />
            {parsing ? <span className="ws-fms-muted">Parsing...</span> : null}
          </div>

          {parseError ? <p className="ws-form-error">{parseError}</p> : null}

          {summary ? (
            <p className="ws-fms-muted">
              {summary.total} rows found: <strong>{summary.valid} valid</strong>,{" "}
              {summary.invalid} with errors.
            </p>
          ) : null}

          {rows.length > 0 ? (
            <div className="ws-sf-table-wrap">
              <table className="ws-fms-data-table ws-sf-data-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Title</th>
                    <th>Team</th>
                    <th>Doer</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td>{row.rowNumber}</td>
                      <td>{row.data.title || "-"}</td>
                      <td>{row.data.team || "-"}</td>
                      <td>{row.data.assigneeEmail || "-"}</td>
                      <td>
                        {row.valid ? (
                          <span className="ws-pc-kind-badge is-checklist">OK</span>
                        ) : (
                          <span className="ws-form-error">{row.errors.join("; ")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {state.message ? (
            <p className={state.ok ? "ws-form-success" : "ws-form-error"}>
              {state.message}
            </p>
          ) : null}

          {validRows.length > 0 ? (
            <form action={action} onSubmit={() => setTimeout(reset, 0)}>
              <input type="hidden" name="rows" value={rowsPayload} />
              <button type="submit" className="btn-primary btn-sm ws-sf-btn-primary">
                Import {validRows.length} valid template
                {validRows.length === 1 ? "" : "s"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
