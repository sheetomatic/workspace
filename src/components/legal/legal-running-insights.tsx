import type { RunningInsights } from "@/lib/legal-cases/view-queries";

export function LegalRunningInsights({ insights }: { insights: RunningInsights }) {
  const cards = [
    { label: "Running", value: insights.total, tone: "primary" },
    { label: "With DL", value: insights.withDl },
    { label: "DL VFN", value: insights.withDlVfn },
    { label: "Bank account", value: insights.withBankAccount },
    { label: "Cheque book", value: insights.withChequeBook },
  ];

  return (
    <div className="legal-running-insights">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`legal-insight-card${card.tone === "primary" ? " is-primary" : ""}`}
        >
          <span>{card.label}</span>
          <strong>{card.value.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}
