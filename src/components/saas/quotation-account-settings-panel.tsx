"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveQuotationBankProfile, saveQuotationGstProfile } from "@/app/app/settings/actions";
import type { QuotationAccountDetails } from "@/lib/leads/seller-account";
import {
  GST_CERTIFICATE_HREF,
  UDYAM_CERTIFICATE_HREF,
} from "@/lib/leads/seller-account";

const initial = { ok: false, message: "" };

export function QuotationAccountSettingsPanel({
  account,
  canEdit,
}: {
  account: QuotationAccountDetails | null;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(saveQuotationGstProfile, initial);
  const [bankState, bankAction, bankPending] = useActionState(saveQuotationBankProfile, initial);
  const address = account?.addressLines.join("\n") ?? "";
  const bankKey = [
    account?.accountHolder,
    account?.bankName,
    account?.accountNumber,
    account?.ifsc,
    account?.upiId,
  ].join("|");

  return (
    <>
    <article className="saas-panel">
      <h3>GST information</h3>
      <p className="saas-panel-lead">
        Legal name, GSTIN, and registered address print on every quotation and tax invoice.
      </p>
      {canEdit ? (
        <form action={action} className="saas-settings-form" key={address + (account?.gstin ?? "")}>
          <label>
            Trade name
            <input defaultValue={account?.tradeName ?? ""} maxLength={200} name="tradeName" />
          </label>
          <label>
            Legal name
            <input defaultValue={account?.legalName ?? ""} maxLength={200} name="legalName" />
          </label>
          <label>
            GSTIN
            <input
              defaultValue={account?.gstin ?? ""}
              maxLength={15}
              name="gstin"
              placeholder="15 characters"
            />
          </label>
          <label>
            PAN
            <input defaultValue={account?.pan ?? ""} maxLength={10} name="pan" />
          </label>
          <label>
            Authorised signatory
            <input
              defaultValue={account?.authorisedSignatory ?? ""}
              maxLength={120}
              name="authorisedSignatory"
            />
          </label>
          <label>
            Registered address
            <textarea
              defaultValue={address}
              name="address"
              rows={4}
              placeholder={"One line per row\nCity, state, PIN"}
            />
          </label>
          <button className="btn-cta btn-secondary saas-settings-save" disabled={pending} type="submit">
            {pending ? "Saving..." : "Save GST information"}
          </button>
          {state.message ? (
            <p className={state.ok ? "saas-form-message ok" : "saas-form-message error"}>{state.message}</p>
          ) : null}
        </form>
      ) : account ? (
        <dl className="saas-settings-list">
          <div>
            <dt>Legal name</dt>
            <dd>{account.legalName}</dd>
          </div>
          <div>
            <dt>Trade name</dt>
            <dd>{account.tradeName}</dd>
          </div>
          <div>
            <dt>GSTIN</dt>
            <dd>{account.gstin}</dd>
          </div>
          <div>
            <dt>Registered address</dt>
            <dd>
              {account.addressLines.map((line) => (
                <span key={line} style={{ display: "block" }}>
                  {line}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="saas-panel-lead">GST information is not set for this workspace yet.</p>
      )}
      <p className="saas-panel-lead" style={{ marginTop: "0.85rem" }}>
        <Link href={GST_CERTIFICATE_HREF} download>
          Download GST certificate
        </Link>
        {" · "}
        <Link href={UDYAM_CERTIFICATE_HREF} target="_blank">
          View Udyam Registration Certificate
        </Link>
      </p>
    </article>
    <article className="saas-panel">
      <h3>Account details</h3>
      <p className="saas-panel-lead">
        Bank and UPI printed on quotations and tax invoices.
      </p>
      {canEdit ? (
        <form action={bankAction} className="saas-settings-form" key={bankKey}>
          <label>
            Account type
            <input defaultValue={account?.accountType ?? ""} maxLength={80} name="accountType" />
          </label>
          <label>
            Account holder
            <input defaultValue={account?.accountHolder ?? ""} maxLength={200} name="accountHolder" />
          </label>
          <label>
            Bank name
            <input defaultValue={account?.bankName ?? ""} maxLength={120} name="bankName" />
          </label>
          <label>
            Branch
            <input defaultValue={account?.branch ?? ""} maxLength={120} name="branch" />
          </label>
          <label>
            Account number
            <input defaultValue={account?.accountNumber ?? ""} inputMode="numeric" maxLength={18} name="accountNumber" />
          </label>
          <label>
            IFSC
            <input defaultValue={account?.ifsc ?? ""} maxLength={11} name="ifsc" />
          </label>
          <label>
            UPI ID
            <input defaultValue={account?.upiId ?? ""} maxLength={80} name="upiId" placeholder="name@bank" />
          </label>
          <button className="btn-cta btn-secondary saas-settings-save" disabled={bankPending} type="submit">
            {bankPending ? "Saving..." : "Save account details"}
          </button>
          {bankState.message ? (
            <p className={bankState.ok ? "saas-form-message ok" : "saas-form-message error"}>
              {bankState.message}
            </p>
          ) : null}
        </form>
      ) : account?.bankName || account?.upiId || account?.accountNumber ? (
        <dl className="saas-settings-list">
          <div>
            <dt>Account holder</dt>
            <dd>{account.accountHolder || "—"}</dd>
          </div>
          <div>
            <dt>Bank</dt>
            <dd>
              {[account.bankName, account.branch].filter(Boolean).join(", ") || "—"}
            </dd>
          </div>
          <div>
            <dt>Account number</dt>
            <dd>
              {[account.accountNumber, account.ifsc].filter(Boolean).join(" · ") || "—"}
            </dd>
          </div>
          <div>
            <dt>UPI ID</dt>
            <dd>{account.upiId || "—"}</dd>
          </div>
        </dl>
      ) : (
        <p className="saas-panel-lead">Account details are not set for this workspace yet.</p>
      )}
    </article>
    </>
  );
}
