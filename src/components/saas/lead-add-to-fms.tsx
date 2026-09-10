"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { GitBranch } from "lucide-react";
import { bridgeLeadToFmsAction } from "@/app/app/leads/actions";
import { fmsInstanceHref } from "@/lib/fms/navigation";

export type LeadFmsLink = {
  id: string;
  referenceLabel: string | null;
  status: string;
  template: { name: string };
} | null;

export type LeadFmsTemplateOption = {
  id: string;
  name: string;
};

export function LeadAddToFmsControl({
  leadId,
  fmsInstance,
  templates,
  canManage,
  compact = false,
  onLinked,
}: {
  leadId: string;
  fmsInstance: LeadFmsLink;
  templates: LeadFmsTemplateOption[];
  canManage: boolean;
  compact?: boolean;
  onLinked?: (instance: NonNullable<LeadFmsLink>) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");

  if (fmsInstance) {
    return (
      <Link
        className={compact ? "leads-icon-btn" : "btn-secondary btn-sm leads-drawer-so-link"}
        href={fmsInstanceHref(fmsInstance.id, "lines")}
        title={fmsInstance.template.name}
        aria-label={`Open FMS ${fmsInstance.template.name}`}
      >
        {compact ? <GitBranch size={16} /> : `FMS · ${fmsInstance.template.name}`}
      </Link>
    );
  }

  if (!canManage) {
    return null;
  }

  if (templates.length === 0) {
    if (compact) {
      return null;
    }
    return (
      <Link href="/app/fms/setup" className="btn-secondary btn-sm leads-drawer-so-link">
        Add FMS workflow
      </Link>
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        className="leads-icon-btn"
        title="Add to FMS"
        aria-label="Add to FMS"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await bridgeLeadToFmsAction(leadId, templateId || undefined);
            if (!result.ok) {
              window.alert(result.message);
              return;
            }
            onLinked?.({
              id: result.instanceId,
              referenceLabel: null,
              status: "ACTIVE",
              template: { name: result.templateName ?? "FMS" },
            });
            router.refresh();
          })
        }
      >
        <GitBranch size={16} />
      </button>
    );
  }

  return (
    <span className="leads-fms-add">
      {templates.length > 1 ? (
        <select
          aria-label="FMS workflow"
          value={templateId}
          disabled={pending}
          onChange={(event) => setTemplateId(event.target.value)}
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      ) : null}
      <button
        type="button"
        className="btn-primary btn-sm"
        disabled={pending || !templateId}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await bridgeLeadToFmsAction(leadId, templateId || undefined);
            if (!result.ok) {
              setError(result.message);
              return;
            }
            onLinked?.({
              id: result.instanceId,
              referenceLabel: null,
              status: "ACTIVE",
              template: { name: result.templateName ?? "FMS" },
            });
            router.refresh();
          })
        }
      >
        {pending ? "Adding…" : "Add to FMS"}
      </button>
      {error ? <span className="leads-fms-add-error">{error}</span> : null}
    </span>
  );
}
