"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export function LegalPrintListToolbar({
  asOfValue,
  sortValue,
  backHref = "/app/cases/views/new-cases",
  backLabel = "Back to New cases",
  showSort = true,
}: {
  asOfValue: string;
  sortValue: string;
  backHref?: string;
  backLabel?: string;
  showSort?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`?${params.toString()}`);
  }

  return (
    <div className="legal-print-toolbar no-print">
      <Link className="btn-ghost" href={backHref}>
        &larr; {backLabel}
      </Link>

      <label className="legal-print-control">
        As on
        <input
          type="date"
          defaultValue={asOfValue}
          onChange={(event) => update("asOf", event.target.value)}
        />
      </label>

      {showSort ? (
        <label className="legal-print-control">
          Sort by
          <select
            defaultValue={sortValue}
            onChange={(event) => update("sort", event.target.value)}
          >
            <option value="field">Field (handler)</option>
            <option value="file">File No.</option>
            <option value="doa">Date of accident</option>
          </select>
        </label>
      ) : null}

      <button
        className="btn-cta btn-primary"
        type="button"
        onClick={() => window.print()}
      >
        Print / Save PDF
      </button>
    </div>
  );
}
