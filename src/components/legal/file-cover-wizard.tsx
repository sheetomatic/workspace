"use client";

import { useActionState, useMemo, useState } from "react";
import type { LegalCase } from "@prisma/client";
import {
  initialFileCoverActionState,
  saveFileCoverAction,
} from "@/app/app/cases/file-cover-actions";
import {
  EMPTY_FILE_COVER,
  type FileCoverData,
} from "@/lib/legal-cases/file-cover";

const STEPS = [
  "Cover & parties",
  "Case related & scans",
  "Process & notes",
  "Advocates & review",
] as const;

type Props = {
  legalCase?: LegalCase;
  initialFileCover?: FileCoverData;
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={className}>
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function FileCoverWizard({ legalCase, initialFileCover }: Props) {
  const [step, setStep] = useState(0);
  const [state, action, pending] = useActionState(
    saveFileCoverAction,
    initialFileCoverActionState,
  );

  const [scalars, setScalars] = useState({
    fileNumber: legalCase?.fileNumber ?? "",
    mccNumber: legalCase?.mccNumber ?? "",
    applicant: legalCase?.applicant ?? "",
    nonApplicant: legalCase?.nonApplicant ?? "",
    category: legalCase?.category ?? "",
    court: legalCase?.court ?? "",
    company: legalCase?.company ?? "",
    fileStatus: legalCase?.fileStatus ?? "RUNNING",
    caseStage: legalCase?.caseStage ?? "",
    prevDate: legalCase?.prevDate ?? "",
    nextDate: legalCase?.nextDate ?? "",
    coAdvocate: legalCase?.coAdvocate ?? "",
    amdCcStatus: legalCase?.amdCcStatus ?? "",
  });

  const [fileCover, setFileCover] = useState<FileCoverData>(
    initialFileCover ?? structuredClone(EMPTY_FILE_COVER),
  );

  const fileCoverJson = useMemo(() => JSON.stringify(fileCover), [fileCover]);

  function patchCover(patch: Partial<FileCoverData>) {
    setFileCover((current) => ({ ...current, ...patch }));
  }

  function updateProcessLog(index: number, key: "date" | "process", value: string) {
    setFileCover((current) => {
      const processLog = [...current.processLog];
      processLog[index] = { ...processLog[index], [key]: value };
      return { ...current, processLog };
    });
  }

  return (
    <form action={action} className="legal-file-cover-wizard saas-form-panel">
      <input name="caseId" type="hidden" value={legalCase?.id ?? ""} />
      <input name="fileCoverJson" type="hidden" value={fileCoverJson} />

      <header className="legal-file-cover-header">
        <h2>{legalCase ? `File cover - ${legalCase.fileNumber}` : "New file cover"}</h2>
        <p>Digital Hingorani file cover. Saves to Cases and syncs the linked Google Sheet row.</p>
      </header>

      <nav aria-label="File cover steps" className="legal-file-cover-steps">
        {STEPS.map((label, index) => (
          <button
            key={label}
            className={index === step ? "active" : undefined}
            type="button"
            onClick={() => setStep(index)}
          >
            {index + 1}. {label}
          </button>
        ))}
      </nav>

      {step === 0 ? (
        <div className="form-grid-premium">
          <Field label="File No." value={scalars.fileNumber} onChange={(value) => setScalars((s) => ({ ...s, fileNumber: value }))} />
          <Field label="MCC No." value={scalars.mccNumber} onChange={(value) => setScalars((s) => ({ ...s, mccNumber: value }))} />
          <Field label="Court" value={scalars.court} onChange={(value) => setScalars((s) => ({ ...s, court: value }))} />
          <Field label="Category (F/SI/GI)" value={scalars.category} onChange={(value) => setScalars((s) => ({ ...s, category: value }))} />
          <Field label="Applicants" value={scalars.applicant} onChange={(value) => setScalars((s) => ({ ...s, applicant: value }))} />
          <Field label="Applicant By" value={fileCover.applicantBy ?? ""} onChange={(value) => patchCover({ applicantBy: value })} />
          <Field label="Non applicants" value={scalars.nonApplicant} onChange={(value) => setScalars((s) => ({ ...s, nonApplicant: value }))} />
          <Field label="Insurance Co." value={scalars.company} onChange={(value) => setScalars((s) => ({ ...s, company: value }))} />
          <Field label="Injured/deceased name" value={fileCover.injuredName ?? ""} onChange={(value) => patchCover({ injuredName: value })} />
          <Field label="Age" value={fileCover.injuredAge ?? ""} onChange={(value) => patchCover({ injuredAge: value })} />
          <Field label="Occupation" value={fileCover.injuredOccupation ?? ""} onChange={(value) => patchCover({ injuredOccupation: value })} />
          <Field label="File status" value={scalars.fileStatus} onChange={(value) => setScalars((s) => ({ ...s, fileStatus: value }))} />
          <Field label="Case stage" value={scalars.caseStage} onChange={(value) => setScalars((s) => ({ ...s, caseStage: value }))} />
          <Field label="Prev date" value={scalars.prevDate} onChange={(value) => setScalars((s) => ({ ...s, prevDate: value }))} />
          <Field label="Next date" value={scalars.nextDate} onChange={(value) => setScalars((s) => ({ ...s, nextDate: value }))} />
          <Field label="AMD & CC status" value={scalars.amdCcStatus} onChange={(value) => setScalars((s) => ({ ...s, amdCcStatus: value }))} />
        </div>
      ) : null}

      {step === 1 ? (
        <div className="form-grid-premium">
          <Field label="LA status" value={fileCover.laStatus ?? ""} onChange={(value) => patchCover({ laStatus: value })} />
          <Field label="DOA" value={fileCover.doa ?? ""} onChange={(value) => patchCover({ doa: value })} />
          <Field label="Police station" value={fileCover.policeStation ?? ""} onChange={(value) => patchCover({ policeStation: value })} />
          <Field label="DOF" value={fileCover.dof ?? ""} onChange={(value) => patchCover({ dof: value })} />
          <Field label="Case number" value={fileCover.caseNumber ?? ""} onChange={(value) => patchCover({ caseNumber: value })} />
          <Field label="DL No." value={fileCover.dlNo ?? ""} onChange={(value) => patchCover({ dlNo: value })} />
          <Field label="RTO" value={fileCover.rto ?? ""} onChange={(value) => patchCover({ rto: value })} />
          <Field label="DOB DL" value={fileCover.dobDl ?? ""} onChange={(value) => patchCover({ dobDl: value })} />
          <Field label="RC No." value={fileCover.rcNo ?? ""} onChange={(value) => patchCover({ rcNo: value })} />
          <Field label="Permit / valid till" value={fileCover.permitTo ?? ""} onChange={(value) => patchCover({ permitTo: value })} />
          <Field label="Fitness / valid till" value={fileCover.fitnessTo ?? ""} onChange={(value) => patchCover({ fitnessTo: value })} />
          <Field label="Policy No." value={fileCover.policyNo ?? ""} onChange={(value) => patchCover({ policyNo: value })} />
          <Field label="Policy issue" value={fileCover.policyIssue ?? ""} onChange={(value) => patchCover({ policyIssue: value })} />
          <Field label="Plaint date" value={fileCover.plaintDate ?? ""} onChange={(value) => patchCover({ plaintDate: value })} />
          <Field label="Plaint by" value={fileCover.plaintBy ?? ""} onChange={(value) => patchCover({ plaintBy: value })} />
          <Field label="NA OD WS date" value={fileCover.naOdWsDate ?? ""} onChange={(value) => patchCover({ naOdWsDate: value })} />
          <Field label="Company WS date" value={fileCover.companyWsDate ?? ""} onChange={(value) => patchCover({ companyWsDate: value })} />
          <Field label="CC received date" value={fileCover.ccReceivedDate ?? ""} onChange={(value) => patchCover({ ccReceivedDate: value })} />
          <Field label="Driver name" value={fileCover.driverName ?? ""} onChange={(value) => patchCover({ driverName: value })} />
          <Field label="Seizure date" value={fileCover.seizureDate ?? ""} onChange={(value) => patchCover({ seizureDate: value })} />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="legal-file-cover-sections">
          <section>
            <h3>Process log</h3>
            <div className="legal-process-log-grid">
              {fileCover.processLog.slice(0, 12).map((entry, index) => (
                <div className="legal-process-log-row" key={`log-${index}`}>
                  <input
                    placeholder="Date"
                    value={entry.date}
                    onChange={(event) => updateProcessLog(index, "date", event.target.value)}
                  />
                  <input
                    placeholder="Process"
                    value={entry.process}
                    onChange={(event) => updateProcessLog(index, "process", event.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="form-grid-premium">
            <label className="form-field-full">
              Notes
              <textarea
                rows={4}
                value={fileCover.notes ?? ""}
                onChange={(event) => patchCover({ notes: event.target.value })}
              />
            </label>
            <Field label="A/C details" value={fileCover.accountDetails ?? ""} onChange={(value) => patchCover({ accountDetails: value })} />
            <Field label="UTR No." value={fileCover.utrNo ?? ""} onChange={(value) => patchCover({ utrNo: value })} />
            <Field label="Deposit date" value={fileCover.depositDate ?? ""} onChange={(value) => patchCover({ depositDate: value })} />
            <Field label="Amount" value={fileCover.amount ?? ""} onChange={(value) => patchCover({ amount: value })} />
            <Field label="Bank" value={fileCover.bank ?? ""} onChange={(value) => patchCover({ bank: value })} />
          </section>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="form-grid-premium">
          <Field label="Advocate of driver" value={fileCover.advocateDriver ?? ""} onChange={(value) => patchCover({ advocateDriver: value })} />
          <Field label="Advocate of owner" value={fileCover.advocateOwner ?? ""} onChange={(value) => patchCover({ advocateOwner: value })} />
          <Field label="Advocate of insurance co." value={fileCover.advocateInsurance ?? ""} onChange={(value) => patchCover({ advocateInsurance: value })} />
          <Field label="Co. advocate (sheet col T)" value={scalars.coAdvocate} onChange={(value) => setScalars((s) => ({ ...s, coAdvocate: value }))} />
          <Field label="Owner/driver lawyer (col AD)" value={fileCover.ownerDriverLawyer ?? ""} onChange={(value) => patchCover({ ownerDriverLawyer: value })} />
          <Field label="OD phone (col AE)" value={fileCover.odPhone ?? ""} onChange={(value) => patchCover({ odPhone: value })} />
          <Field label="Co. file No." value={fileCover.coFileNo ?? ""} onChange={(value) => patchCover({ coFileNo: value })} />
          <Field label="Party phone numbers" value={fileCover.partyPhones ?? ""} onChange={(value) => patchCover({ partyPhones: value })} className="form-field-full" />
        </div>
      ) : null}

      {Object.entries(scalars).map(([key, value]) => (
        <input key={key} name={key} type="hidden" value={value} />
      ))}

      <div className="form-actions legal-file-cover-actions">
        {step > 0 ? (
          <button className="btn-cta btn-ghost" type="button" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <button className="btn-cta btn-secondary" type="button" onClick={() => setStep((s) => s + 1)}>
            Next
          </button>
        ) : (
          <button className="btn-cta btn-primary" disabled={pending} type="submit">
            {pending ? "Saving..." : "Save file cover"}
          </button>
        )}
      </div>

      {state.message ? (
        <p className={state.ok ? "saas-form-message ok" : "saas-form-message error"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
