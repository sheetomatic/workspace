"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import {
  importImsItemsAction,
  type ImsActionState,
} from "@/app/app/ims/actions";

type ParsedRow = {
  rowNumber: number;
  data: {
    code: string;
    name: string;
    itemType: string;
    abcClass: string;
    qcOnReceipt: string;
    unitCost: number;
    minQty: number;
    reorderQty: number;
    maxQty: number;
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

const initial: ImsActionState = { ok: false, message: "" };

const TEMPLATE_HEADERS = [
  "code",
  "name",
  "type",
  "uom",
  "category",
  "abcClass",
  "unitCost",
  "minQty",
  "reorderQty",
  "maxQty",
  "qcOnReceipt",
  "isActive",
];

const TEMPLATE_SAMPLE = [
  "RM-001",
  "Steel sheet 2mm",
  "Raw material",
  "kg",
  "Metals",
  "A",
  "120",
  "100",
  "250",
  "1000",
  "Optional",
  "Yes",
];

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(","), TEMPLATE_SAMPLE.join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "item-master-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ImsItemImport() {
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [summary, setSummary] = useState<ParseResponse["summary"] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, action] = useFormState(importImsItemsAction, initial);

  function reset() {
    setRows([]);
    setSummary(null);
    setParseError("");
    if (fileRef.current) fileRef.current.value = "";
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
      const res = await fetch("/api/ims/import/items", { method: "POST", body });
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
    <section className="ws-ims-panel ws-ims-panel-wide ws-ims-import">
      <div className="ws-ims-panel-head">
        <h2>Bulk upload</h2>
        <button
          type="button"
          className="ws-btn-secondary ws-btn-small"
          onClick={() => {
            setOpen((value) => !value);
            if (open) reset();
          }}
        >
          {open ? "Close" : "Import from CSV / Excel"}
        </button>
      </div>

      {open ? (
        <div className="ws-ims-import-body">
          <p className="ws-ims-help">
            Upload a CSV or Excel file to create or update many items at once. Rows are
            matched to existing items by code. Download the template for the correct
            columns.
          </p>

          <div className="ws-ims-import-controls">
            <button type="button" className="ws-btn-secondary" onClick={downloadTemplate}>
              Download template
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleFile}
            />
            {parsing ? <span className="ws-ims-help">Parsing...</span> : null}
          </div>

          {parseError ? (
            <p className="ws-ims-feedback ws-ims-feedback-error">{parseError}</p>
          ) : null}

          {summary ? (
            <p className="ws-ims-help">
              {summary.total} rows found: <strong>{summary.valid} valid</strong>,{" "}
              {summary.invalid} with errors.
            </p>
          ) : null}

          {rows.length > 0 ? (
            <div className="ws-ims-table-wrap ws-ims-import-preview">
              <table className="ws-ims-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Cost</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={row.valid ? "" : "ws-ims-row-invalid"}
                    >
                      <td>{row.rowNumber}</td>
                      <td>{row.data.code || "-"}</td>
                      <td>{row.data.name || "-"}</td>
                      <td>{row.data.itemType === "RAW_MATERIAL" ? "RM" : "FG"}</td>
                      <td>{row.data.unitCost}</td>
                      <td>
                        {row.valid ? (
                          <span className="ws-ims-pill ws-ims-pill-green">OK</span>
                        ) : (
                          <span className="ws-ims-import-errors">
                            {row.errors.join("; ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {state.message ? (
            <p
              className={
                state.ok
                  ? "ws-ims-feedback"
                  : "ws-ims-feedback ws-ims-feedback-error"
              }
            >
              {state.message}
            </p>
          ) : null}

          {validRows.length > 0 ? (
            <form action={action} onSubmit={() => setTimeout(reset, 0)}>
              <input type="hidden" name="rows" value={rowsPayload} />
              <button type="submit" className="ws-btn-primary">
                Import {validRows.length} valid item
                {validRows.length === 1 ? "" : "s"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
