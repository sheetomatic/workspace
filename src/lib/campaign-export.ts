import {
  MESSAGE_STATUS_LABELS,
  UPLOAD_RESULT_LABELS,
  formatRedlavaEpoch,
  type RedlavaCampaignDetailRow,
  type RedlavaMessageReportRow,
} from "@/lib/integrations/redlava-campaigns";
import { rowsToCsv } from "@/lib/csv-utils";

function formatResultLabel(result: string) {
  return (
    UPLOAD_RESULT_LABELS[result]?.label ??
    result.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function messageCustomerName(row: RedlavaMessageReportRow) {
  const param = row.message?.template?.components?.[0]?.parameters?.[0]?.text;
  return param?.trim() || "";
}

function messagePhone(row: RedlavaMessageReportRow) {
  const to = row.message?.to ?? "";
  return to ? (to.startsWith("+") ? to : `+${to}`) : "";
}

export function campaignDetailsToCsv(rows: RedlavaCampaignDetailRow[]) {
  const data = [
    ["Row", "Creation time", "Receiver number", "Result", "Customer name", "Remark"],
    ...rows.map((row) => [
      String(row.rowNumber || ""),
      formatRedlavaEpoch(row.creationTime),
      row.data.receiverNumber ?? "",
      formatResultLabel(row.result),
      row.data["Customer Name"]?.trim() || "",
      row.remark?.trim() || "",
    ]),
  ];
  return rowsToCsv(data);
}

export function campaignMessagesToCsv(rows: RedlavaMessageReportRow[]) {
  const data = [
    ["Creation time", "Receiver number", "Status", "Customer name", "Error"],
    ...rows.map((row) => [
      formatRedlavaEpoch(row.creationTime),
      messagePhone(row),
      MESSAGE_STATUS_LABELS[row.lastStatus] ?? row.lastStatus,
      messageCustomerName(row),
      row.error?.message?.trim() || row.error?.title?.trim() || "",
    ]),
  ];
  return rowsToCsv(data);
}
