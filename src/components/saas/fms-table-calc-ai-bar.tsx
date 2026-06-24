"use client";

import { useState } from "react";
import { suggestTableCalculationAction } from "@/app/app/fms/actions";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import {
  applyTableCalcSuggestion,
  type TableCalcAiSuggestion,
} from "@/lib/fms/table-calc-ai";
import { describeColumnFormula } from "@/lib/fms/table-calculations";
import {
  isCalculatedTableColumn,
  type FmsTableColumn,
  type FmsTableFooterTotal,
} from "@/lib/fms/constants";

const EXAMPLE_PROMPTS = [
  "Qty × Rate = Line total",
  "Sum all line totals as Grand total",
  "Discount 10% off subtotal",
];

function isErrorMessage(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("unavailable") ||
    lower.includes("quota") ||
    lower.includes("failed") ||
    lower.includes("error") ||
    lower.includes("limit") ||
    lower.includes("add at least") ||
    lower.includes("could not") ||
    lower.includes("network")
  );
}

function summarizeSuggestion(
  suggestion: TableCalcAiSuggestion,
  columns: FmsTableColumn[],
) {
  const parts: string[] = [];
  for (const column of suggestion.newColumns ?? []) {
    if (column.label) {
      parts.push(`New number column: ${column.label}`);
    }
  }
  for (const column of suggestion.columns ?? []) {
    const label = column.label ?? column.key ?? "Calculated column";
    const formula = column.formula
      ? describeColumnFormula(
          {
            key: column.key ?? "calc",
            label,
            columnType: "CALCULATED",
            formula: column.formula,
          },
          columns,
        )
      : "";
    parts.push(formula ? `${label}: ${formula}` : label);
  }
  for (const total of suggestion.footerTotals ?? []) {
    parts.push(`Footer total: ${total.label}`);
  }
  return parts;
}

export function FmsTableCalcAiBar({
  columns,
  footerTotals,
  onApply,
}: {
  columns: FmsTableColumn[];
  footerTotals: FmsTableFooterTotal[];
  onApply: (patch: {
    tableColumns: FmsTableColumn[];
    tableFooterTotals: FmsTableFooterTotal[];
    highlightColumnKeys: string[];
    message: string;
  }) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<TableCalcAiSuggestion | null>(null);

  async function runSuggest(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 4) {
      setMessage("Describe what to calculate in a few words.");
      return;
    }

    setBusy(true);
    setMessage("");
    setPending(null);
    try {
      const result = await suggestTableCalculationAction({
        description: trimmed,
        columns,
        footerTotals,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setPending(result.suggestion);
      setMessage(result.suggestion.explanation);
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleApply() {
    if (!pending) {
      return;
    }

    const applied = applyTableCalcSuggestion(columns, footerTotals, pending);
    if (!applied.ok) {
      setMessage(applied.message);
      return;
    }

    onApply({
      tableColumns: applied.columns,
      tableFooterTotals: applied.footerTotals,
      highlightColumnKeys: applied.appliedColumnKeys,
      message: applied.explanation,
    });
    setPrompt("");
    setPending(null);
    setMessage(applied.explanation);
  }

  function handleDiscard() {
    setPending(null);
    setMessage("");
  }

  return (
    <section className="ws-fms-flow-ai ws-fms-table-calc-ai is-compact">
      <div className="ws-fms-flow-ai-head">
        <SheetomaticAiMark variant="icon" sizes="lg" />
        <div>
          <h3>AI calculations</h3>
          <p className="ws-fms-muted">
            Describe totals in plain language — we set up the columns and
            formulas for you.
          </p>
        </div>
      </div>

      <div className="ws-fms-flow-ai-starters">
        <span className="ws-fms-flow-ai-starters-label">Try:</span>
        <div className="ws-fms-flow-ai-starter-chips">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              className="ws-fms-flow-ai-starter-chip"
              disabled={busy}
              onClick={() => {
                setPrompt(example);
                void runSuggest(example);
              }}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div className="ws-fms-flow-ai-input-row">
        <input
          className="ws-fms-table-calc-ai-input"
          type="text"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="e.g. Multiply quantity by rate for line total"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void runSuggest(prompt);
            }
          }}
        />
      </div>

      <div className="ws-fms-flow-ai-actions">
        <button
          type="button"
          className="btn-cta btn-secondary"
          disabled={busy}
          onClick={() => void runSuggest(prompt)}
        >
          <SheetomaticAiMark variant="icon" sizes="sm" className="ws-fms-ai-btn-mark" />
          {busy ? "Thinking..." : "Suggest"}
        </button>
      </div>

      {pending ? (
        <div className="ws-fms-table-calc-ai-preview">
          <p className="ws-fms-table-calc-ai-preview-lead">{pending.explanation}</p>
          <ul className="ws-fms-table-calc-ai-preview-list">
            {summarizeSuggestion(pending, columns).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="ws-fms-table-calc-ai-preview-actions">
            <button
              type="button"
              className="btn-cta btn-primary"
              onClick={handleApply}
            >
              Apply to table
            </button>
            <button
              type="button"
              className="btn-cta btn-secondary"
              onClick={handleDiscard}
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p
          className={
            isErrorMessage(message)
              ? "ws-fms-flow-ai-message saas-form-message error"
              : "ws-fms-flow-ai-message saas-form-message ok"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}

export function columnCardHighlightClass(
  column: FmsTableColumn,
  highlightKeys: string[],
) {
  return highlightKeys.includes(column.key) && isCalculatedTableColumn(column)
    ? " is-ai-highlight"
    : "";
}
