"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startLinkedInConnection, disconnectLinkedInAccount, syncMyLinkedInAccount } from "@/app/app/leads/linkedin-actions";
import "./linkedin-connections.css";

export type LinkedInAccountView = {
  id: string;
  displayName: string;
  enabled: boolean;
  needsReconnect: boolean;
  baselineCompletedAt: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  recorded: number;
};

const CALLBACK_MESSAGES: Record<string, string> = {
  connected: "LinkedIn connected and Invitations API access verified. The initial history scan will run next.",
  cancelled: "LinkedIn connection was cancelled.",
  permission: "Connection could not be verified. Check the app's approved Invitations API permissions and reconnect.",
  expired: "The connection session expired. Sign in to this workspace and try again.",
  invalid_state: "The connection session could not be verified. Please start again.",
  access: "Active CRM workspace access is required.",
  account_owner: "This LinkedIn account is already connected by another member of this workspace.",
  busy: "This account is syncing. Please reconnect when the sync finishes.",
};

export function LinkedInConnectionsPanel({ configured, accounts, callbackStatus }: {
  configured: boolean;
  accounts: LinkedInAccountView[];
  callbackStatus?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(
    callbackStatus && CALLBACK_MESSAGES[callbackStatus]
      ? { ok: callbackStatus === "connected", message: CALLBACK_MESSAGES[callbackStatus] } : null,
  );

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setFeedback(null);
    startTransition(async () => {
      try {
        setFeedback(await action());
        router.refresh();
      } catch {
        setFeedback({ ok: false, message: "This action could not finish. Please try again." });
      }
    });
  }

  return (
    <div className="linkedin-connections">
      <section className="linkedin-intro saas-panel" aria-labelledby="linkedin-title">
        <div>
          <span className="linkedin-kicker">OFFICIAL LINKEDIN INTEGRATION</span>
          <h2 id="linkedin-title">Turn accepted connections into leads.</h2>
          <p>Send your connection requests on LinkedIn. Once acceptance is confirmed, the person appears in your workspace&apos;s Leads, assigned to you.</p>
        </div>
        <ol className="linkedin-steps">
          <li><span>1</span>Connect your account</li>
          <li><span>2</span>Send a request on LinkedIn</li>
          <li><span>3</span>Accepted → added to Leads</li>
        </ol>
        {!configured ? (
          <div className="linkedin-access-note" role="status">
            <strong>Awaiting official LinkedIn access</strong>
            <p>Sheetomatic needs LinkedIn partner approval for the Invitations API and permission to use the returned data in CRM. Account connections will become available after this is configured.</p>
            <a href="https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/invitations" target="_blank" rel="noopener noreferrer">
              View LinkedIn&apos;s access requirements ↗
            </a>
          </div>
        ) : null}
        <div className="linkedin-connect-row">
          <button type="button" className="btn-primary" disabled={!configured || pending} onClick={() => {
            setFeedback(null);
            startTransition(async () => {
              try {
                const result = await startLinkedInConnection();
                if (result.ok) window.location.assign(result.url);
                else setFeedback(result);
              } catch {
                setFeedback({ ok: false, message: "Could not start the LinkedIn connection. Please try again." });
              }
            });
          }}>
            {pending ? "Working…" : "Connect my LinkedIn"}
          </button>
          <p>You sign in and authorise access on LinkedIn. Each team member connects their own account.</p>
        </div>
        {feedback ? <p className={`linkedin-feedback ${feedback.ok ? "is-success" : "is-error"}`} role={feedback.ok ? "status" : "alert"}>{feedback.message}</p> : null}
      </section>

      <section aria-labelledby="linkedin-accounts-title">
        <h2 id="linkedin-accounts-title">Your connected accounts</h2>
        {accounts.length ? (
          <div className="linkedin-account-grid">
            {accounts.map((account) => (
              <article className="saas-panel linkedin-account" key={account.id}>
                <div className="linkedin-account-head">
                  <h3>{account.displayName}</h3>
                  <span className="linkedin-account-status">
                    {account.needsReconnect ? "Reconnect required" : !account.enabled ? "Disconnected" :
                      !configured ? "Sync paused" :
                      !account.baselineCompletedAt ? "Preparing monitoring" : "Monitoring"}
                  </span>
                </div>
                <p><strong>{account.recorded}</strong> accepted connections recorded</p>
                <p className="leads-machine-muted">
                  Last sync: {account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "Not run yet"}
                </p>
                {account.enabled && !account.baselineCompletedAt ? (
                  <p>We first record existing connections without importing them. Start outreach after this screen reports Monitoring; acceptances during the initial scan are treated as history.</p>
                ) : null}
                {account.lastSyncError ? <p className="linkedin-feedback is-error" role="status">{account.lastSyncError}</p> : null}
                <div className="linkedin-account-actions">
                  <button type="button" className="btn-secondary btn-sm" disabled={pending || !configured || !account.enabled || account.needsReconnect}
                    onClick={() => run(() => syncMyLinkedInAccount(account.id))}>Sync now</button>
                  {account.enabled || account.needsReconnect ? (
                    <button type="button" className="btn-secondary btn-sm" disabled={pending}
                      onClick={() => run(() => disconnectLinkedInAccount(account.id))}>Disconnect</button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="saas-panel linkedin-empty">
            <h3>No LinkedIn account connected</h3>
            <p>Your existing leads stay in place. New accepted outbound connections will appear in Leads after account setup and the initial scan.</p>
          </div>
        )}
      </section>

      <section className="saas-panel linkedin-details" aria-labelledby="linkedin-expect-title">
        <h2 id="linkedin-expect-title">What to expect</h2>
        <ul>
          <li>Automatic checks run hourly when the connection is active. Large account histories can take multiple runs.</li>
          <li>Pending requests and incoming requests do not create leads.</li>
          <li>Only available, permitted details are saved. A missing phone or email will not block the lead.</li>
          <li>Repeated syncs keep one lead per LinkedIn member in your workspace.</li>
          <li>This connection reads invitations. Conversation history requires separate LinkedIn access.</li>
        </ul>
      </section>
    </div>
  );
}
