import type { LegalCase } from "@prisma/client";
import { fileCoverFromLegalCase } from "@/lib/legal-cases/file-cover";

export function FileCoverPrintView({ legalCase }: { legalCase: LegalCase }) {
  const cover = fileCoverFromLegalCase(legalCase);

  return (
    <div className="legal-file-cover-print">
      <header className="legal-file-cover-print-header">
        <div>
          <strong>File No.</strong>
          <span>{legalCase.fileNumber}</span>
        </div>
        <div className="legal-file-cover-print-brand">
          <h1>HINGORANI LAW CHAMBER</h1>
          <p>Bhopal | Motor Accident Claims</p>
        </div>
        <div>
          <strong>MCC No.</strong>
          <span>{legalCase.mccNumber ?? "-"}</span>
          <br />
          <strong>Court</strong>
          <span>{legalCase.court ?? "-"}</span>
        </div>
      </header>

      <section className="legal-file-cover-print-parties">
        <p>
          <strong>Applicants:</strong> {legalCase.applicant ?? "-"} {cover.applicantBy ? `(By ${cover.applicantBy})` : ""}
        </p>
        <p className="legal-file-cover-print-vs">V/s</p>
        <p>
          <strong>Non applicants:</strong> {legalCase.nonApplicant ?? "-"}
        </p>
        <p>
          <strong>Insurance Co.:</strong> {legalCase.company ?? "-"}
        </p>
        <p>
          <strong>Name / Age / Occupation:</strong>{" "}
          {[cover.injuredName, cover.injuredAge, cover.injuredOccupation].filter(Boolean).join(" | ") || "-"}
        </p>
      </section>

      <div className="legal-file-cover-print-columns">
        <section>
          <h2>Case related</h2>
          <ul>
            <li>LA STATUS: {cover.laStatus || "-"}</li>
            <li>DOA / PS: {[cover.doa, cover.policeStation].filter(Boolean).join(" / ") || "-"}</li>
            <li>DOF / C.N.: {[cover.dof, cover.caseNumber].filter(Boolean).join(" / ") || "-"}</li>
            <li>DL NO.: {cover.dlNo || "-"}</li>
            <li>RTO / DOB DL: {[cover.rto, cover.dobDl].filter(Boolean).join(" / ") || "-"}</li>
            <li>RC NO.: {cover.rcNo || "-"}</li>
            <li>PERMIT / TO: {cover.permitTo || "-"}</li>
            <li>FITNESS / TO: {cover.fitnessTo || "-"}</li>
            <li>POLICY NO.: {cover.policyNo || "-"}</li>
            <li>POLICY ISSUE: {cover.policyIssue || "-"}</li>
          </ul>
        </section>
        <section>
          <h2>Scan document</h2>
          <ul>
            <li>PLAINT DATE / BY: {[cover.plaintDate, cover.plaintBy].filter(Boolean).join(" / ") || "-"}</li>
            <li>NA OD WS DATE: {cover.naOdWsDate || "-"}</li>
            <li>COMPANY WS DATE: {cover.companyWsDate || "-"}</li>
            <li>CC RECEIVED: {cover.ccReceivedDate || "-"}</li>
            <li>DRIVER NAME: {cover.driverName || "-"}</li>
            <li>SEIZURE DATE: {cover.seizureDate || "-"}</li>
          </ul>
        </section>
      </div>

      <section className="legal-file-cover-print-process">
        <h2>Process log</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Process</th>
              <th>Date</th>
              <th>Process</th>
              <th>Date</th>
              <th>Process</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, rowIndex) => {
              const base = rowIndex * 3;
              const cells = cover.processLog.slice(base, base + 3);
              return (
                <tr key={`process-row-${rowIndex}`}>
                  {cells.flatMap((entry, cellIndex) => [
                    <td key={`d-${rowIndex}-${cellIndex}`}>{entry.date || ""}</td>,
                    <td key={`p-${rowIndex}-${cellIndex}`}>{entry.process || ""}</td>,
                  ])}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <footer className="legal-file-cover-print-footer">
        <p>Advocate of Driver: {cover.advocateDriver || "-"}</p>
        <p>Advocate of Owner: {cover.advocateOwner || "-"}</p>
        <p>Advocate of Insurance co.: {cover.advocateInsurance || legalCase.coAdvocate || "-"}</p>
        <p>Co. File No.: {cover.coFileNo || "-"}</p>
        <p>Party Phone: {cover.partyPhones || cover.odPhone || "-"}</p>
        <p>
          Status: {legalCase.fileStatus ?? "-"} | Stage: {legalCase.caseStage ?? "-"} | Prev:{" "}
          {legalCase.prevDate ?? "-"} | Next: {legalCase.nextDate ?? "-"}
        </p>
      </footer>

      {cover.notes ? (
        <section>
          <h2>Notes</h2>
          <p>{cover.notes}</p>
        </section>
      ) : null}
    </div>
  );
}
