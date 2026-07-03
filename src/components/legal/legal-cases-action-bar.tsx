"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
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
  return (
    <div className="legal-sync-wrap">
      <Link className="btn-cta btn-secondary legal-sync-btn" href="/app/cases/settings">
        Import & export
      </Link>
      <p className="saas-sheets-hint">
        Upload CSV or Excel, download backups, and restore previous imports.
      </p>
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
