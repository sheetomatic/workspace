"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { regenerateLeadsApiKey } from "@/app/app/leads/actions";
import { LeadsNurtureMessagesPanel } from "@/components/saas/leads-nurture-messages-panel";
import { LeadsSourceSettingsPanel } from "@/components/saas/leads-source-settings-panel";
import {
  LeadsWebBasedApiSettingsPanel,
  type LeadsWebBasedApiSettingsProps,
} from "@/components/saas/leads-web-based-api-settings";
import type { LeadNurtureOrgConfig } from "@/lib/leads/nurture/events";
import type { LeadSourceCardModel } from "@/lib/leads/source-settings";
import "@/components/saas/leads-machine.css";

export function LeadsSettingsPanel({
  apiKeyHint,
  ingestUrl,
  webBasedApi,
  nurtureConfig,
  nurtureSendingActive,
  leadSources,
}: {
  apiKeyHint: string | null;
  ingestUrl: string;
  webBasedApi: LeadsWebBasedApiSettingsProps;
  nurtureConfig: LeadNurtureOrgConfig;
  nurtureSendingActive: boolean;
  leadSources: LeadSourceCardModel[];
}) {
  const [pending, startTransition] = useTransition();
  const [freshKey, setFreshKey] = useState<string | null>(null);

  return (
    <div className="saas-page leads-settings-page">
      <header className="saas-page-head leads-settings-head">
        <div>
          <Link className="btn-secondary btn-sm" href="/app/leads">
            ← Back to leads
          </Link>
          <h1>CRM settings</h1>
          <p>
            Web Based API credentials for nurture sends, message templates, and
            live lead source connectors (Official WhatsApp, Meta Lead Ads,
            Telegram). Sheet sync runs from the Leads page toolbar.
          </p>
        </div>
      </header>

      <div className="leads-settings-stack">
        <LeadsWebBasedApiSettingsPanel
          {...webBasedApi}
          nurtureSendingActive={nurtureSendingActive}
        />
        <LeadsNurtureMessagesPanel
          config={nurtureConfig}
          sendingActive={nurtureSendingActive}
        />
        <LeadsSourceSettingsPanel sources={leadSources} />

        <section className="saas-panel leads-settings-api">
          <details>
            <summary>Ingest API (advanced)</summary>
            <p className="leads-machine-muted">
              POST leads from any system to <code>{ingestUrl}</code>
            </p>
            <p className="leads-machine-muted">
              Header: <code>Authorization: Bearer &lt;api-key&gt;</code>
            </p>
            {apiKeyHint ? (
              <p className="leads-machine-muted">
                Current key ends with: ...{apiKeyHint}
              </p>
            ) : (
              <p className="leads-machine-muted">No API key generated yet.</p>
            )}
            {freshKey ? <div className="leads-api-key">{freshKey}</div> : null}
            <button
              type="button"
              className="btn-primary mt-4"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await regenerateLeadsApiKey();
                  if (result.ok && result.apiKey) {
                    setFreshKey(result.apiKey);
                  }
                })
              }
            >
              {apiKeyHint ? "Regenerate API key" : "Generate API key"}
            </button>
          </details>
        </section>
      </div>
    </div>
  );
}
