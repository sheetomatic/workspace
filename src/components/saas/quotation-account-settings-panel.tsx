"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveQuotationGstProfile } from "@/app/app/settings/actions";
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
  const address = account?.addressLines.join("\n") ?? "";

  return (
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
      {account?.bankName ? (
        <dl className="saas-settings-list" style={{ marginTop: "1rem" }}>
          <div>
            <dt>Account holder</dt>
            <dd>{account.accountHolder}</dd>
          </div>
          <div>
            <dt>Bank</dt>
            <dd>
              {account.bankName}, {account.branch}
            </dd>
          </div>
          <div>
            <dt>Account number</dt>
            <dd>
              {account.accountNumber} · {account.ifsc}
            </dd>
          </div>
          <div>
            <dt>UPI ID</dt>
            <dd>{account.upiId}</dd>
          </div>
        </dl>
      ) : null}
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
  );
}
