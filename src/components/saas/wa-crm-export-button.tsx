"use client";

import { Download } from "lucide-react";
import { useState } from "react";

export function WaCrmExportButton() {
  const [exporting, setExporting] = useState(false);

  function runExport() {
    setExporting(true);
    window.location.href = "/api/ai/crm/export";
    window.setTimeout(() => setExporting(false), 1500);
  }

  return (
    <button
      className="ai-export-btn wa-crm-export-btn"
      disabled={exporting}
      type="button"
      onClick={runExport}
    >
      <Download aria-hidden size={16} strokeWidth={2.25} />
      <span>{exporting ? "Exporting..." : "Download CSV"}</span>
    </button>
  );
}
