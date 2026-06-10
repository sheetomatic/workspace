"use client";

import { Download } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

const exportBtnClass =
  "inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[0.8125rem] font-semibold leading-none text-slate-800 shadow-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

export function AiCsvExportButton({
  label = "Download CSV",
  pendingLabel = "Exporting...",
  pending,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
  pendingLabel?: string;
  pending?: boolean;
}) {
  return (
    <button
      className={[exportBtnClass, className].filter(Boolean).join(" ")}
      type="button"
      {...props}
    >
      <Download aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2.25} />
      <span>{pending ? pendingLabel : label}</span>
    </button>
  );
}
