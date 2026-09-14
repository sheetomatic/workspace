"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createWaCampaignAction } from "@/app/app/leads/campaign-actions";
import { campaignStatusLabel } from "@/lib/crm/wa-campaign-variables";
import "./crm-campaigns.css";

export type CampaignListItem = {
  id: string;
  name: string;
  status: string;
  templateName: string | null;
  pauseReason: string | null;
  counts: {
    total: number;
    pending: number;
    sent: number;
    failed: number;
    skipped: number;
  };
};

export function CrmCampaignsList({
  campaigns,
}: {
  campaigns: CampaignListItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="crm-campaigns-stack">
      <form
        className="crm-campaign-create"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          setError(null);
          startTransition(async () => {
            const result = await createWaCampaignAction(formData);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            form.reset();
            router.push(`/app/leads/campaigns/${result.campaignId}`);
          });
        }}
      >
        <input
          name="name"
          placeholder="Campaign name"
          aria-label="Campaign name"
          required
        />
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? "Creating…" : "New campaign"}
        </button>
      </form>
      {error ? (
        <p className="crm-campaign-banner error" role="alert">
          {error}
        </p>
      ) : null}

      {campaigns.length === 0 ? (
        <p className="crm-campaign-empty">
          No campaigns yet. Create one, add CRM contacts, pick an approved
          template, then send.
        </p>
      ) : (
        campaigns.map((campaign) => (
          <Link
            key={campaign.id}
            className="crm-campaign-card"
            href={`/app/leads/campaigns/${campaign.id}`}
          >
            <div className="crm-campaign-card-top">
              <h2>{campaign.name}</h2>
              <span
                className={`crm-campaign-status is-${campaign.status.toLowerCase()}`}
              >
                {campaignStatusLabel(campaign.status)}
              </span>
            </div>
            <p className="crm-campaign-meta">
              {campaign.templateName || "No template yet"} · sent{" "}
              {campaign.counts.sent} · failed {campaign.counts.failed} · pending{" "}
              {campaign.counts.pending}
            </p>
            {campaign.pauseReason ? (
              <p className="crm-campaign-meta">{campaign.pauseReason}</p>
            ) : null}
          </Link>
        ))
      )}
    </div>
  );
}
