"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Pencil,
  RotateCcw,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  confirmLegalCasesImportAction,
  previewLegalCasesImportAction,
  restoreLegalCasesBackupAction,
  searchLegalCasesForSettingsAction,
} from "@/app/app/cases/settings-actions";
import {
  initialLegalCasesSettingsState,
  type LegalCaseSearchRow,
} from "@/app/app/cases/settings-types";
import { LegalCaseEditForm } from "@/components/legal/legal-case-edit-form";

export type LegalCasesImportSettings = {
  legalSheetHeaderRow: number;
  caseCount: number;
  backup: {
    caseCount: number;
    sourceFilename: string | null;
    createdAt: string;
  } | null;
};

type ImportStep = "upload" | "preview";
type SettingsTab = "import" | "export" | "edit";

function formatBackupDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LegalCasesSettingsPanel({
  settings,
}: {
  settings: LegalCasesImportSettings;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>("import");
  const [importStep, setImportStep] = useState<ImportStep>("upload");
  const [headerRow, setHeaderRow] = useState(settings.legalSheetHeaderRow);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<
    NonNullable<(typeof initialLegalCasesSettingsState)["preview"]>
  >();
  const [previewMessage, setPreviewMessage] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [editingCase, setEditingCase] = useState<LegalCaseSearchRow | null>(null);
  const [previewPending, startPreview] = useTransition();
  const [confirmPending, startConfirm] = useTransition();
  const [restorePending, startRestore] = useTransition();

  const [searchState, searchAction, searchPending] = useActionState(
    searchLegalCasesForSettingsAction,
    initialLegalCasesSettingsState,
  );

  const busy = previewPending || confirmPending || searchPending || restorePending;

  function resetImportFlow() {
    setImportStep("upload");
    setSelectedFile(null);
    setPreview(undefined);
    setPreviewMessage("");
    setConfirmMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function pickFile(file: File | null) {
    if (!file) {
      return;
    }
    const name = file.name.toLowerCase();
    if (!/\.(csv|xlsx|xls)$/.test(name)) {
      setPreviewMessage("Please choose a .csv, .xlsx, or .xls file.");
      return;
    }
    setSelectedFile(file);
    setPreview(undefined);
    setPreviewMessage("");
    setConfirmMessage("");
    setImportStep("upload");
    setActiveTab("import");
  }

  function handleFileChange(file: File | null) {
    if (file) {
      pickFile(file);
    } else {
      resetImportFlow();
    }
  }

  function runPreview(nextHeaderRow = headerRow) {
    if (!selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.set("file", selectedFile);
    formData.set("legalSheetHeaderRow", String(nextHeaderRow));
    formData.set("currentCaseCount", String(settings.caseCount));

    startPreview(async () => {
      const result = await previewLegalCasesImportAction(
        initialLegalCasesSettingsState,
        formData,
      );
      setPreviewMessage(result.message);
      if (result.preview) {
        setPreview(result.preview);
        setHeaderRow(result.preview.headerRow);
        setImportStep("preview");
      }
    });
  }

  function runConfirm() {
    if (!selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.set("file", selectedFile);
    formData.set("legalSheetHeaderRow", String(headerRow));

    startConfirm(async () => {
      const result = await confirmLegalCasesImportAction(
        initialLegalCasesSettingsState,
        formData,
      );
      setConfirmMessage(result.message);
      if (result.ok) {
        window.location.reload();
      }
    });
  }

  function handleRestore() {
    startRestore(async () => {
      await restoreLegalCasesBackupAction(initialLegalCasesSettingsState);
      window.location.reload();
    });
  }

  return (
    <div className="legal-cases-settings">
      <div className="legal-cases-settings-stats">
        <div className="legal-cases-settings-stat">
          <span>Cases in portal</span>
          <strong>{settings.caseCount.toLocaleString()}</strong>
        </div>
        <div className="legal-cases-settings-stat">
          <span>Header row</span>
          <strong>{settings.legalSheetHeaderRow}</strong>
        </div>
        <div className="legal-cases-settings-stat">
          <span>Last backup</span>
          <strong>
            {settings.backup
              ? `${settings.backup.caseCount.toLocaleString()} cases`
              : "None yet"}
          </strong>
        </div>
      </div>

      {settings.backup ? (
        <div className="legal-cases-settings-alert info">
          <div>
            <strong>Restore previous import</strong>
            <p>
              Backup from {formatBackupDate(settings.backup.createdAt)}
              {settings.backup.sourceFilename
                ? ` before importing ${settings.backup.sourceFilename}`
                : ""}
              . Use this if the latest import used the wrong file or header row.
            </p>
          </div>
          <button
            className="btn-cta btn-secondary"
            disabled={busy}
            type="button"
            onClick={handleRestore}
          >
            <RotateCcw aria-hidden size={16} strokeWidth={2.25} />
            {restorePending ? "Restoring..." : "Restore backup"}
          </button>
        </div>
      ) : null}

      <div className="legal-cases-settings-tabs" role="tablist" aria-label="Data tools">
        <button
          aria-selected={activeTab === "import"}
          className={`legal-cases-settings-tab${activeTab === "import" ? " is-active" : ""}`}
          role="tab"
          type="button"
          onClick={() => setActiveTab("import")}
        >
          <Upload aria-hidden size={16} strokeWidth={2.25} />
          Import
        </button>
        <button
          aria-selected={activeTab === "export"}
          className={`legal-cases-settings-tab${activeTab === "export" ? " is-active" : ""}`}
          role="tab"
          type="button"
          onClick={() => setActiveTab("export")}
        >
          <Download aria-hidden size={16} strokeWidth={2.25} />
          Export
        </button>
        <button
          aria-selected={activeTab === "edit"}
          className={`legal-cases-settings-tab${activeTab === "edit" ? " is-active" : ""}`}
          role="tab"
          type="button"
          onClick={() => setActiveTab("edit")}
        >
          <Pencil aria-hidden size={16} strokeWidth={2.25} />
          Quick edit
        </button>
      </div>

      {activeTab === "import" ? (
        <section className="legal-cases-settings-block">
          <div className="legal-cases-settings-block-head">
            <FileSpreadsheet aria-hidden size={20} strokeWidth={2} />
            <div>
              <h2>Import master workbook</h2>
              <p className="legal-cases-settings-lead">
                Replace all portal cases from your CSV or Excel file. Always preview
                first — a backup is saved automatically before import.
              </p>
            </div>
          </div>

          <ol className="legal-cases-settings-steps">
            <li className={importStep === "upload" ? "is-current" : "is-done"}>
              <span>1</span> Choose file
            </li>
            <li className={importStep === "preview" ? "is-current" : ""}>
              <span>2</span> Preview & confirm
            </li>
          </ol>

          {importStep === "upload" ? (
            <div className="legal-cases-settings-import-upload">
              <input
                ref={fileInputRef}
                accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="legal-cases-settings-file-input"
                name="file"
                type="file"
                onChange={(event) =>
                  handleFileChange(event.target.files?.[0] ?? null)
                }
              />

              <div
                className={`legal-cases-settings-dropzone${dragActive ? " is-dragover" : ""}${selectedFile ? " has-file" : ""}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  pickFile(event.dataTransfer.files?.[0] ?? null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="legal-cases-settings-file-card">
                    <FileUp aria-hidden size={28} strokeWidth={1.75} />
                    <div className="legal-cases-settings-file-meta">
                      <strong>{selectedFile.name}</strong>
                      <span>{formatFileSize(selectedFile.size)}</span>
                    </div>
                    <button
                      aria-label="Remove file"
                      className="legal-cases-settings-file-remove"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        resetImportFlow();
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload aria-hidden size={32} strokeWidth={1.75} />
                    <strong>Drop your workbook here</strong>
                    <span>or click to browse — CSV, XLSX, XLS up to 25 MB</span>
                  </>
                )}
              </div>

              <div className="legal-cases-settings-header-panel">
                <div className="legal-cases-settings-header-copy">
                  <h3>Which row has column headers?</h3>
                  <p>
                    Row <strong>1</strong> when headers are on the first line. Row{" "}
                    <strong>2</strong> when row 1 only has section labels (typical
                    Hingorani sheet).
                  </p>
                </div>
                <div
                  className="legal-cases-settings-header-pills"
                  role="group"
                  aria-label="Header row"
                >
                  {[1, 2, 3].map((row) => (
                    <button
                      key={row}
                      className={`legal-cases-settings-header-pill${headerRow === row ? " is-active" : ""}`}
                      type="button"
                      onClick={() => setHeaderRow(row)}
                    >
                      Row {row}
                    </button>
                  ))}
                  <label className="legal-cases-settings-header-custom">
                    <span>Other</span>
                    <input
                      min={1}
                      type="number"
                      value={headerRow}
                      onChange={(event) =>
                        setHeaderRow(Math.max(1, Number(event.target.value) || 1))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="legal-cases-settings-actions legal-cases-settings-actions--primary">
                <button
                  className="btn-cta btn-primary"
                  disabled={busy || !selectedFile}
                  type="button"
                  onClick={() => runPreview(headerRow)}
                >
                  <Upload aria-hidden size={16} strokeWidth={2.25} />
                  {previewPending ? "Checking file..." : "Preview import"}
                </button>
              </div>

              {previewMessage && !preview ? (
                <p className="saas-form-message error">{previewMessage}</p>
              ) : null}
            </div>
          ) : (
            <div className="legal-cases-settings-import-preview">
              <div className="legal-cases-settings-preview-meta">
                <div>
                  <strong>{preview?.filename ?? selectedFile?.name}</strong>
                  <span>
                    Header row {preview?.headerRow ?? headerRow} ·{" "}
                    {preview?.parsedCount.toLocaleString() ?? "0"} cases parsed
                  </span>
                </div>
                <button
                  className="btn-ghost"
                  disabled={busy}
                  type="button"
                  onClick={resetImportFlow}
                >
                  <ArrowLeft aria-hidden size={16} strokeWidth={2.25} />
                  Choose another file
                </button>
              </div>

              {preview ? (
                <>
                  <div className="legal-cases-settings-preview-stats">
                    <div>
                      <span>File rows</span>
                      <strong>{preview.stats.sheetRows.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span>Rows with F.No</span>
                      <strong>{preview.stats.sheetFileRows.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span>F.No range</span>
                      <strong>
                        {preview.stats.minFileNumber ?? "?"} –{" "}
                        {preview.stats.maxFileNumber ?? "?"}
                      </strong>
                    </div>
                    <div>
                      <span>Detected headers</span>
                      <strong>{preview.detectedHeaders.slice(0, 4).join(", ")}</strong>
                    </div>
                  </div>

                  {preview.warnings.length > 0 ? (
                    <div className="legal-cases-settings-alert warn">
                      <AlertTriangle aria-hidden size={18} strokeWidth={2.25} />
                      <div>
                        <strong>Review before importing</strong>
                        <ul>
                          {preview.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="legal-cases-settings-alert ok">
                      <CheckCircle2 aria-hidden size={18} strokeWidth={2.25} />
                      <div>
                        <strong>Preview looks healthy</strong>
                        <p>Sample rows below match the expected workbook layout.</p>
                      </div>
                    </div>
                  )}

                  <div className="legal-cases-settings-header-row-tools">
                    <span>Wrong count? Try another header row:</span>
                    <div className="legal-cases-settings-header-pills">
                      {[1, 2, 3].map((row) => (
                        <button
                          key={row}
                          className={`legal-cases-settings-header-pill${preview.headerRow === row ? " is-active" : ""}`}
                          disabled={busy || !selectedFile}
                          type="button"
                          onClick={() => {
                            setHeaderRow(row);
                            runPreview(row);
                          }}
                        >
                          Row {row}
                        </button>
                      ))}
                      <button
                        className="legal-cases-settings-header-pill"
                        disabled={busy || !selectedFile}
                        type="button"
                        onClick={() => runPreview(headerRow)}
                      >
                        Re-check row {headerRow}
                      </button>
                    </div>
                  </div>

                  <div className="legal-cases-settings-sample-table-wrap">
                    <table className="legal-cases-settings-sample-table">
                      <thead>
                        <tr>
                          <th>File No.</th>
                          <th>MCC No.</th>
                          <th>Applicant</th>
                          <th>Stage</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sampleCases.map((item) => (
                          <tr key={`${item.fileNumber}:${item.mccNumber ?? ""}`}>
                            <td>{item.fileNumber}</td>
                            <td>{item.mccNumber ?? "—"}</td>
                            <td>{item.applicant ?? "—"}</td>
                            <td>{item.caseStage ?? "—"}</td>
                            <td>{item.fileStatus ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="legal-cases-settings-confirm-bar">
                    <p>
                      This will replace{" "}
                      <strong>{settings.caseCount.toLocaleString()}</strong> current
                      cases with{" "}
                      <strong>{preview.parsedCount.toLocaleString()}</strong> from
                      your file.
                    </p>
                    <div className="legal-cases-settings-actions">
                      <button
                        className="btn-cta btn-primary"
                        disabled={busy || !selectedFile}
                        type="button"
                        onClick={runConfirm}
                      >
                        {confirmPending
                          ? "Importing..."
                          : `Confirm import (${preview.parsedCount.toLocaleString()} cases)`}
                      </button>
                      <button
                        className="btn-cta btn-secondary"
                        disabled={busy}
                        type="button"
                        onClick={resetImportFlow}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              ) : null}

              {confirmMessage ? (
                <p className="saas-form-message error">{confirmMessage}</p>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "export" ? (
        <section className="legal-cases-settings-block">
          <div className="legal-cases-settings-block-head">
            <Download aria-hidden size={20} strokeWidth={2} />
            <div>
              <h2>Export workbook</h2>
              <p className="legal-cases-settings-lead">
                Download all {settings.caseCount.toLocaleString()} cases in the master
                sheet column layout. CSV is fastest for large files.
              </p>
            </div>
          </div>
          <div className="legal-cases-settings-export-grid">
            <a
              className="legal-cases-settings-export-card"
              href="/api/legal-cases/export?format=csv"
            >
              <Download aria-hidden size={22} strokeWidth={2} />
              <strong>Download CSV</strong>
              <span>Recommended · opens in Excel or Google Sheets</span>
            </a>
            <a
              className="legal-cases-settings-export-card"
              href="/api/legal-cases/export?format=xlsx"
            >
              <FileSpreadsheet aria-hidden size={22} strokeWidth={2} />
              <strong>Download Excel</strong>
              <span>.xlsx workbook · may take a minute for 4k+ cases</span>
            </a>
          </div>
        </section>
      ) : null}

      {activeTab === "edit" ? (
        <section className="legal-cases-settings-block">
          <div className="legal-cases-settings-block-head">
            <Pencil aria-hidden size={20} strokeWidth={2} />
            <div>
              <h2>Edit existing cases</h2>
              <p className="legal-cases-settings-lead">
                Search by file number, MCC, or applicant — update fields without
                re-importing the whole workbook.
              </p>
            </div>
          </div>

          <form
            action={searchAction}
            className="legal-cases-settings-search-form"
            onSubmit={() => setEditingCase(null)}
          >
            <label className="legal-cases-settings-search-field">
              <span className="legal-cases-settings-search-label">Search cases</span>
              <input
                name="q"
                placeholder="File number, MCC, or applicant name"
                required
                type="search"
              />
            </label>
            <button className="btn-cta btn-secondary" disabled={searchPending} type="submit">
              <Search aria-hidden size={16} strokeWidth={2.25} />
              {searchPending ? "Searching..." : "Find cases"}
            </button>
          </form>

          {searchState.message ? (
            <p
              className={
                searchState.ok ? "saas-form-message ok" : "saas-form-message error"
              }
            >
              {searchState.message}
            </p>
          ) : null}

          {searchState.cases && searchState.cases.length > 0 ? (
            <div className="legal-cases-settings-sample-table-wrap">
              <table className="legal-cases-settings-sample-table">
                <thead>
                  <tr>
                    <th>File No.</th>
                    <th>MCC No.</th>
                    <th>Applicant</th>
                    <th>Status</th>
                    <th>Next date</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {searchState.cases.map((item) => (
                    <tr key={item.id}>
                      <td>{item.fileNumber}</td>
                      <td>{item.mccNumber ?? "—"}</td>
                      <td>{item.applicant ?? "—"}</td>
                      <td>{item.fileStatus ?? "—"}</td>
                      <td>{item.nextDate ?? "—"}</td>
                      <td className="legal-cases-settings-row-actions">
                        <button
                          className="btn-ghost"
                          type="button"
                          onClick={() => setEditingCase(item)}
                        >
                          Edit
                        </button>
                        <Link className="btn-ghost" href={`/app/cases/${item.id}`}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {editingCase ? (
            <LegalCaseEditForm
              legalCase={editingCase}
              onCancel={() => setEditingCase(null)}
              onSaved={() => {
                setEditingCase(null);
                window.location.reload();
              }}
            />
          ) : null}
        </section>
      ) : null}

      <details className="legal-cases-settings-help">
        <summary>Import tips</summary>
        <ul>
          <li>
            Always use <strong>Preview import</strong> first. If counts look wrong,
            switch header row or upload a different export.
          </li>
          <li>
            A backup of your current cases is saved automatically before each full
            import.
          </li>
          <li>
            <Link href="/app/cases/list">Open case list</Link> for full case detail,
            documents, and file cover.
          </li>
        </ul>
      </details>
    </div>
  );
}
