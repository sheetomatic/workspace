import { rowsToCsv } from "@/lib/csv-utils";

export function buildCampaignSampleCsv(variableColumns: string[]) {
  const headers = ["receiverNumber", ...variableColumns];
  const sampleRow = [
    "+919876543210",
    ...variableColumns.map((_, index) => `Sample Value ${index + 1}`),
  ];
  return rowsToCsv([headers, sampleRow]);
}

export function downloadTextFile(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
