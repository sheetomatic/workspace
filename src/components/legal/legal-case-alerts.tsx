import type { LegalCase } from "@prisma/client";
import {
  clientCallStaleDays,
  lastClientCallDate,
  needsClientCallAlert,
  needsSigningFilingAlert,
  signingFilingGapDays,
  SIGNING_FILING_ALERT_DAYS,
  CLIENT_CALL_ALERT_DAYS,
} from "@/lib/legal-cases/case-alerts";

export function LegalCaseAlerts({
  legalCase,
  section,
}: {
  legalCase: LegalCase;
  section: number;
}) {
  const signingGap = signingFilingGapDays(legalCase);
  const showSigning =
    section === 2 && needsSigningFilingAlert(legalCase) && signingGap !== null;
  const showClientCall = needsClientCallAlert(legalCase);
  const callDays = clientCallStaleDays(legalCase);
  const lastCall = lastClientCallDate(legalCase);

  if (!showSigning && !showClientCall) {
    return null;
  }

  return (
    <div className="legal-case-alerts">
      {showSigning ? (
        <p className="legal-process-alert legal-process-alert-danger">
          Signing was {signingGap} days ago ({legalCase.signingDate}) but the case is
          not filed yet. CSV rule: alert after {SIGNING_FILING_ALERT_DAYS} days — update
          Case filed or signing date in Section 2.
        </p>
      ) : null}
      {showClientCall ? (
        <p className="legal-process-alert legal-process-alert-warn">
          Client call overdue — last logged {lastCall || "never"}
          {callDays !== null ? ` (${callDays} days ago)` : ""}. Voice note 7: call every{" "}
          {CLIENT_CALL_ALERT_DAYS} days and log below.
        </p>
      ) : null}
    </div>
  );
}
