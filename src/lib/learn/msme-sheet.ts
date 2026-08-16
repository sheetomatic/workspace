/** Public Google Sheet template students File → Make a copy. */
export const DEFAULT_LEARN_MSME_SHEET_ID =
  "1x5HFOaDZ9bkTl-f9Iu8X_LbSFl8TO6v7RmnmzZY05hY";

export const LEARN_MSME_SHEET_ID =
  process.env.LEARN_MSME_SHEET_ID?.trim() || DEFAULT_LEARN_MSME_SHEET_ID;

export function learnMsmeCopyUrl() {
  if (!LEARN_MSME_SHEET_ID) return null;
  return `https://docs.google.com/spreadsheets/d/${LEARN_MSME_SHEET_ID}/copy`;
}

export function learnMsmePreviewUrl() {
  if (!LEARN_MSME_SHEET_ID) return null;
  return `https://docs.google.com/spreadsheets/d/${LEARN_MSME_SHEET_ID}/preview`;
}
