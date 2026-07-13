"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { TaskDepartment } from "@prisma/client";
import { upsertEmployeeProfileAction } from "@/lib/hr/hr-actions";
import { TASK_DEPARTMENT_LABELS } from "@/lib/tasks";
import { EmployeeDocumentsPanel } from "@/components/hr/employee-documents-panel";

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export type EmployeeProfileFormData = {
  membershipId: string;
  name: string | null;
  email: string;
  role: string;
  designation: string | null;
  department: TaskDepartment | null;
  dateOfJoining: Date | string | null;
  monthlySalary: number | null;
  staffCode: string | null;
  profile: {
    id: string;
    employeeCode: string;
    employmentType: string;
    status: string;
    phone: string | null;
    emergencyContact: string | null;
    address: string | null;
    dateOfBirth: Date | string | null;
    gender: string | null;
    pan: string | null;
    aadhaar: string | null;
    aadhaarLast4: string | null;
    basic: number | null;
    hra: number | null;
    specialAllowance: number | null;
    esiApplicable: boolean;
    esiNumber: string | null;
    pfApplicable: boolean;
    uan: string | null;
    pfNumber: string | null;
    taxRegime: string | null;
    tdsMonthly: number | null;
    bankName: string | null;
    bankAccountNumber: string | null;
    ifsc: string | null;
    collarCategory?: string;
    hourlyRate?: number | null;
    documents: Array<{
      id: string;
      docType: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      uploadedAt: Date | string;
    }>;
  } | null;
};

export function EmployeeProfileForm({
  data,
  canEdit,
  canEditDocs,
}: {
  data: EmployeeProfileFormData;
  /** Salary / sensitive profile fields — ADMIN only. */
  canEdit: boolean;
  /** Document upload/delete — ADMIN or self. Defaults to canEdit. */
  canEditDocs?: boolean;
}) {
  const docsEditable = canEditDocs ?? canEdit;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const p = data.profile;
  const defaultCode = p?.employeeCode ?? data.staffCode ?? "";

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await upsertEmployeeProfileAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Employee profile saved.");
      router.refresh();
    });
  }

  return (
    <div className="ws-hr-employee-form">
      <div className="ws-hr-employee-identity">
        <div>
          <h2>{data.name ?? data.email}</h2>
          <p className="ws-apple-cell-secondary">
            {data.email} · {data.role}
          </p>
        </div>
        {!canEdit ? (
          <p className="ws-hr-note">
            {docsEditable
              ? "Profile fields are view only — you can still upload onboarding documents below."
              : "View only — ask an admin to update this record."}
          </p>
        ) : null}
      </div>

      <form action={onSubmit} className="ws-hr-form">
        <input type="hidden" name="membershipId" value={data.membershipId} />

        <section className="ws-hr-form-section">
          <h3>Personal</h3>
          <div className="ws-hr-form-grid">
            <label>
              Phone
              <input
                name="phone"
                type="tel"
                defaultValue={p?.phone ?? ""}
                disabled={!canEdit}
                placeholder="10-digit mobile"
              />
            </label>
            <label>
              Emergency contact
              <input
                name="emergencyContact"
                type="text"
                defaultValue={p?.emergencyContact ?? ""}
                disabled={!canEdit}
              />
            </label>
            <label>
              Date of birth
              <input
                name="dateOfBirth"
                type="date"
                defaultValue={toDateInput(p?.dateOfBirth)}
                disabled={!canEdit}
              />
            </label>
            <label>
              Gender
              <select
                name="gender"
                defaultValue={p?.gender ?? ""}
                disabled={!canEdit}
              >
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              PAN
              <input
                name="pan"
                type="text"
                defaultValue={p?.pan ?? ""}
                disabled={!canEdit}
                maxLength={10}
                placeholder="ABCDE1234F"
                style={{ textTransform: "uppercase" }}
              />
            </label>
            <label>
              Aadhaar
              <input
                name="aadhaar"
                type="text"
                defaultValue={p?.aadhaar ?? ""}
                disabled={!canEdit}
                maxLength={12}
                placeholder={p?.aadhaarLast4 ? `••••${p.aadhaarLast4}` : "12 digits"}
              />
            </label>
          </div>
          <label>
            Address
            <textarea
              name="address"
              rows={2}
              defaultValue={p?.address ?? ""}
              disabled={!canEdit}
            />
          </label>
        </section>

        <section className="ws-hr-form-section">
          <h3>Job</h3>
          <div className="ws-hr-form-grid">
            <label>
              Employee code
              <input
                name="employeeCode"
                type="text"
                required
                defaultValue={defaultCode}
                disabled={!canEdit}
                placeholder="EMP001"
              />
            </label>
            <label>
              Employment type
              <select
                name="employmentType"
                defaultValue={p?.employmentType ?? "FULL_TIME"}
                disabled={!canEdit}
              >
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </label>
            <label>
              Status
              <select
                name="status"
                defaultValue={p?.status ?? "ACTIVE"}
                disabled={!canEdit}
              >
                <option value="ACTIVE">Active</option>
                <option value="EXITED">Exited</option>
              </select>
            </label>
            <label>
              Designation
              <input
                name="designation"
                type="text"
                defaultValue={data.designation ?? ""}
                disabled={!canEdit}
                placeholder="e.g. Sales Executive"
              />
            </label>
            <label>
              Department
              <select
                name="department"
                defaultValue={data.department ?? ""}
                disabled={!canEdit}
              >
                <option value="">—</option>
                {(Object.keys(TASK_DEPARTMENT_LABELS) as TaskDepartment[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {TASK_DEPARTMENT_LABELS[key]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Date of joining
              <input
                name="dateOfJoining"
                type="date"
                defaultValue={toDateInput(data.dateOfJoining)}
                disabled={!canEdit}
              />
            </label>
            <label>
              Category (White / Blue)
              <select
                name="collarCategory"
                defaultValue={p?.collarCategory ?? "WHITE"}
                disabled={!canEdit}
              >
                <option value="WHITE">White — standard (no OT)</option>
                <option value="BLUE">Blue — overtime eligible</option>
              </select>
            </label>
            <label>
              OT hourly rate (₹)
              <input
                name="hourlyRate"
                type="number"
                min={0}
                step="0.01"
                defaultValue={p?.hourlyRate ?? ""}
                disabled={!canEdit}
                placeholder="Blank = derive from salary"
              />
            </label>
          </div>
          <p className="ws-hr-help">
            Blue collar: OT hours from late checkout past work end, or manager entry.
            Rate defaults to monthly salary ÷ (26 × daily hours) when blank.
          </p>
        </section>

        <section className="ws-hr-form-section">
          <h3>Compensation</h3>
          <p className="ws-hr-help">
            Gross monthly salary drives payroll. Basic / HRA / allowance appear on the
            salary slip (defaults apply if left blank).
          </p>
          <div className="ws-hr-form-grid">
            <label>
              Monthly gross (₹)
              <input
                name="monthlySalary"
                type="number"
                min={0}
                step="0.01"
                defaultValue={data.monthlySalary ?? ""}
                disabled={!canEdit}
              />
            </label>
            <label>
              Basic (₹)
              <input
                name="basic"
                type="number"
                min={0}
                step="0.01"
                defaultValue={p?.basic ?? ""}
                disabled={!canEdit}
              />
            </label>
            <label>
              HRA (₹)
              <input
                name="hra"
                type="number"
                min={0}
                step="0.01"
                defaultValue={p?.hra ?? ""}
                disabled={!canEdit}
              />
            </label>
            <label>
              Special allowance (₹)
              <input
                name="specialAllowance"
                type="number"
                min={0}
                step="0.01"
                defaultValue={p?.specialAllowance ?? ""}
                disabled={!canEdit}
              />
            </label>
          </div>
        </section>

        <section className="ws-hr-form-section">
          <h3>Statutory (ESI / PF / TDS)</h3>
          <div className="ws-hr-form-grid">
            <label className="ws-hr-checkbox">
              <input
                type="checkbox"
                name="esiApplicable"
                value="true"
                defaultChecked={p?.esiApplicable ?? false}
                disabled={!canEdit}
              />
              <span>ESI applicable</span>
            </label>
            <label>
              ESI number
              <input
                name="esiNumber"
                type="text"
                defaultValue={p?.esiNumber ?? ""}
                disabled={!canEdit}
              />
            </label>
            <label className="ws-hr-checkbox">
              <input
                type="checkbox"
                name="pfApplicable"
                value="true"
                defaultChecked={p?.pfApplicable ?? false}
                disabled={!canEdit}
              />
              <span>PF applicable</span>
            </label>
            <label>
              UAN
              <input
                name="uan"
                type="text"
                defaultValue={p?.uan ?? ""}
                disabled={!canEdit}
              />
            </label>
            <label>
              PF number
              <input
                name="pfNumber"
                type="text"
                defaultValue={p?.pfNumber ?? ""}
                disabled={!canEdit}
              />
            </label>
            <label>
              Tax regime
              <select
                name="taxRegime"
                defaultValue={p?.taxRegime ?? ""}
                disabled={!canEdit}
              >
                <option value="">—</option>
                <option value="OLD">Old</option>
                <option value="NEW">New</option>
              </select>
            </label>
            <label>
              Monthly TDS (₹)
              <input
                name="tdsMonthly"
                type="number"
                min={0}
                step="0.01"
                defaultValue={p?.tdsMonthly ?? ""}
                disabled={!canEdit}
              />
            </label>
          </div>
        </section>

        <section className="ws-hr-form-section">
          <h3>Bank</h3>
          <div className="ws-hr-form-grid">
            <label>
              Bank name
              <input
                name="bankName"
                type="text"
                defaultValue={p?.bankName ?? ""}
                disabled={!canEdit}
              />
            </label>
            <label>
              Account number
              <input
                name="bankAccountNumber"
                type="text"
                defaultValue={p?.bankAccountNumber ?? ""}
                disabled={!canEdit}
                autoComplete="off"
              />
            </label>
            <label>
              IFSC
              <input
                name="ifsc"
                type="text"
                defaultValue={p?.ifsc ?? ""}
                disabled={!canEdit}
                maxLength={11}
                style={{ textTransform: "uppercase" }}
              />
            </label>
          </div>
        </section>

        {canEdit ? (
          <div className="ws-hr-form-actions">
            <button type="submit" className="btn-cta btn-primary" disabled={pending}>
              {pending ? "Saving…" : p ? "Save employee" : "Register employee"}
            </button>
          </div>
        ) : null}

        {message ? (
          <p
            className={isError ? "ws-hr-feedback-error" : "ws-hr-feedback"}
            role="status"
          >
            {message}
          </p>
        ) : null}
      </form>

      <EmployeeDocumentsPanel
        employeeProfileId={p?.id ?? null}
        documents={p?.documents ?? []}
        canEdit={docsEditable}
      />
    </div>
  );
}
