"use client";

export function PrintFileCoverButton() {
  return (
    <button className="btn-cta btn-primary" type="button" onClick={() => window.print()}>
      Print / Save PDF
    </button>
  );
}
