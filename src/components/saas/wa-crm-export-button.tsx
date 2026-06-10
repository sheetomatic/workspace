"use client";

import { useState } from "react";
import { AiCsvExportButton } from "@/components/saas/ai-csv-export-button";

export function WaCrmExportButton() {
  const [exporting, setExporting] = useState(false);

  function runExport() {
    setExporting(true);
    window.location.href = "/api/ai/crm/export";
    window.setTimeout(() => setExporting(false), 1500);
  }

  return (
    <AiCsvExportButton disabled={exporting} pending={exporting} onClick={runExport} />
  );
}
