import { rowsToCsv } from "@/lib/csv-utils";

export const WHATSAPP_API_CLIENT_IMPORT_HEADERS = [
  "name",
  "phone",
  "company",
  "email",
  "plan",
  "kind",
  "amount",
  "days",
  "started",
  "expires",
  "notes",
] as const;

export function whatsAppApiClientCsvTemplate(): string {
  return rowsToCsv([
    [...WHATSAPP_API_CLIENT_IMPORT_HEADERS],
    [
      "Ramesh",
      "9876543210",
      "Acme Traders",
      "ramesh@acme.com",
      "official-basic-monthly",
      "Official",
      "",
      "",
      "2026-08-01",
      "2026-08-31",
      "",
    ],
    [
      "Priya",
      "9123456789",
      "Priya Stores",
      "",
      "plan-unlimited-1m",
      "Unofficial",
      "",
      "",
      "2026-08-01",
      "",
      "",
    ],
    [
      "Custom Co",
      "9988776655",
      "",
      "",
      "custom",
      "Unofficial",
      "4500",
      "45",
      "2026-08-01",
      "",
      "WABA id optional",
    ],
  ]);
}
