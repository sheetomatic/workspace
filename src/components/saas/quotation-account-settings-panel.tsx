import Link from "next/link";
import type { QuotationAccountDetails } from "@/lib/leads/seller-account";
import { UDYAM_CERTIFICATE_HREF } from "@/lib/leads/seller-account";

export function QuotationAccountSettingsPanel({
  account,
}: {
  account: QuotationAccountDetails | null;
}) {
  if (!account) {
    return (
      <article className="saas-panel">
        <h3>Invoice / Quotation account</h3>
        <p className="saas-panel-lead">
          Bank, PAN, UPI, and Udyam details print on quotations and invoices
          once they are set for this workspace.
        </p>
      </article>
    );
  }

  return (
    <article className="saas-panel">
      <h3>Invoice / Quotation account</h3>
      <p className="saas-panel-lead">
        These details print on every Sheetomatic quotation and invoice.
      </p>
      <dl className="saas-settings-list">
        <div>
          <dt>Legal name</dt>
          <dd>{account.legalName}</dd>
        </div>
        <div>
          <dt>PAN</dt>
          <dd>{account.pan}</dd>
        </div>
        <div>
          <dt>Udyam Aadhaar</dt>
          <dd>{account.udyamNumber}</dd>
        </div>
        <div>
          <dt>Account type</dt>
          <dd>{account.accountType}</dd>
        </div>
        <div>
          <dt>Account holder</dt>
          <dd>{account.accountHolder}</dd>
        </div>
        <div>
          <dt>Bank</dt>
          <dd>{account.bankName}</dd>
        </div>
        <div>
          <dt>Account number</dt>
          <dd>{account.accountNumber}</dd>
        </div>
        <div>
          <dt>IFSC</dt>
          <dd>{account.ifsc}</dd>
        </div>
        <div>
          <dt>UPI ID</dt>
          <dd>{account.upiId}</dd>
        </div>
        <div>
          <dt>Payment QR</dt>
          <dd>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={account.qrImageSrc}
              alt={`PhonePe QR — pay ${account.accountHolder}`}
              style={{
                width: 148,
                height: "auto",
                display: "block",
                marginTop: 6,
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                background: "#fff",
              }}
            />
          </dd>
        </div>
      </dl>
      <p className="saas-panel-lead" style={{ marginTop: "0.85rem" }}>
        <Link href={UDYAM_CERTIFICATE_HREF} target="_blank">
          View Udyam Registration Certificate
        </Link>
      </p>
    </article>
  );
}
