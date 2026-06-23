"use client";

import { Suspense, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import {
  exportLegalCasesToGoogleSheetAction,
  syncLegalCasesFromGoogleSheet,
} from "@/app/app/cases/actions";
import { LegalCaseCreateForm } from "@/components/legal/legal-case-create-form";

export function NewLegalCaseTrigger({
  className,
  showWhenOpen = false,
}: {
  className?: string;
  showWhenOpen?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOpen = searchParams.get("new") === "1";

  if (isOpen && !showWhenOpen) {
    return null;
  }

  function openCreate() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("new", "1");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <button
      className={className ?? "btn-cta btn-primary legal-new-case-trigger"}
      type="button"
      onClick={openCreate}
    >
      <Plus aria-hidden size={18} strokeWidth={2.25} />
      New case
    </button>
  );
}

function LegalCaseCreatePanelInner({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOpen = searchParams.get("new") === "1";

  if (!canCreate || !isOpen) {
    return null;
  }

  function closeCreate() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="legal-create-overlay">
      <div className="legal-create-dialog">
        <button
          aria-label="Close"
          className="legal-create-close"
          type="button"
          onClick={closeCreate}
        >
          <X size={18} />
        </button>
        <LegalCaseCreateForm onCancel={closeCreate} />
      </div>
    </div>
  );
}

export function LegalCaseCreatePanel({ canCreate }: { canCreate: boolean }) {
  return (
    <Suspense fallback={null}>
      <LegalCaseCreatePanelInner canCreate={canCreate} />
    </Suspense>
  );
}

export function LegalSheetSyncButton() {
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  function runSync(
    action: () => Promise<{ ok: boolean; message: string }>,
  ) {
    startTransition(async () => {
      const result = await action();
      setOk(result.ok);
      setMessage(result.message);
    });
  }

  return (
    <div className="legal-sync-wrap">
      <div className="legal-sync-actions">
        <button
          className="btn-cta btn-secondary legal-sync-btn"
          disabled={pending}
          type="button"
          onClick={() => runSync(syncLegalCasesFromGoogleSheet)}
        >
          {pending ? "Syncing..." : "Import"}
        </button>
        <button
          className="btn-cta btn-secondary legal-sync-btn"
          disabled={pending}
          type="button"
          onClick={() => runSync(exportLegalCasesToGoogleSheetAction)}
        >
          {pending ? "Syncing..." : "Export"}
        </button>
      </div>
      {message ? (
        <p className={ok ? "saas-form-message ok" : "saas-form-message error"}>
          {message}
        </p>
      ) : (
        <p className="saas-sheets-hint">
          Set your CRM sheet URL in Settings, then import or export cases here.
        </p>
      )}
    </div>
  );
}

export function LegalCasesPageActions({
  canCreate,
  canSync,
}: {
  canCreate: boolean;
  canSync: boolean;
}) {
  return (
    <div className="legal-page-actions">
      {canSync ? <LegalSheetSyncButton /> : null}
      {canCreate ? (
        <Suspense fallback={null}>
          <NewLegalCaseTrigger />
        </Suspense>
      ) : null}
    </div>
  );
}
