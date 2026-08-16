/** Public Google Sheet template. Filled when the seed script creates one. */
export const LEARN_MSME_SHEET_ID = process.env.LEARN_MSME_SHEET_ID?.trim() || "";

export function learnMsmeCopyUrl() {
  if (!LEARN_MSME_SHEET_ID) return null;
  return `https://docs.google.com/spreadsheets/d/${LEARN_MSME_SHEET_ID}/copy`;
}

export function learnMsmePreviewUrl() {
  if (!LEARN_MSME_SHEET_ID) return null;
  return `https://docs.google.com/spreadsheets/d/${LEARN_MSME_SHEET_ID}/preview`;
}
