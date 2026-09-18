import type { OfferLetterStatus } from "@prisma/client";

/** Client-safe labels (no server-only imports). */
export function offerStatusLabel(status: OfferLetterStatus | string) {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "SENT":
      return "Sent — awaiting response";
    case "ACCEPTED":
      return "Accepted";
    case "DECLINED":
      return "Declined";
    case "EXPIRED":
      return "Expired";
    case "WITHDRAWN":
      return "Withdrawn";
    default:
      return String(status);
  }
}
