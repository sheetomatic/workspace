import {
  isCalculatedTableColumn,
  normalizeTableColumn,
  normalizeTableFooterTotal,
  slugifyFieldKey,
  type FmsTableColumn,
  type FmsTableFooterTotal,
} from "@/lib/fms/constants";
import { numericSourceColumns } from "@/lib/fms/table-calculations";

export type TableCalcAiSuggestion = {
  explanation: string;
  columns?: Array<Partial<FmsTableColumn>>;
  newColumns?: Array<Partial<FmsTableColumn>>;
  footerTotals?: FmsTableFooterTotal[];
};

export type TableCalcAiApplyResult =
  | {
      ok: true;
      columns: FmsTableColumn[];
      footerTotals: FmsTableFooterTotal[];
      appliedColumnKeys: string[];
      explanation: string;
    }
  | { ok: false; message: string };

function columnLookup(columns: FmsTableColumn[]) {
  const byKey = new Map(columns.map((column) => [column.key, column]));
  const byLabel = new Map(
    columns.map((column) => [slugifyFieldKey(column.label), column]),
  );
  return { byKey, byLabel };
}

/** Match operand reference to an existing column key (exact key, slug, or fuzzy label). */
export function resolveOperandColumnKey(
  reference: string,
  columns: FmsTableColumn[],
): string | null {
  const trimmed = reference.trim();
  if (!trimmed) {
    return null;
  }

  const { byKey, byLabel } = columnLookup(columns);
  if (byKey.has(trimmed)) {
    return trimmed;
  }

  const slug = slugifyFieldKey(trimmed);
  if (byLabel.has(slug)) {
    return byLabel.get(slug)!.key;
  }

  const lower = trimmed.toLowerCase();
  const fuzzy = columns.find((column) => {
    const label = column.label.toLowerCase();
    return (
      label === lower ||
      label.includes(lower) ||
      lower.includes(label) ||
      column.key.toLowerCase() === lower
    );
  });
  return fuzzy?.key ?? null;
}

function resolveFooterColumnKey(
  reference: string,
  columns: FmsTableColumn[],
): string | null {
  const direct = resolveOperandColumnKey(reference, columns);
  if (direct) {
    return direct;
  }
  const summable = columns.filter(
    (column) =>
      column.columnType === "NUMBER" || isCalculatedTableColumn(column),
  );
  return resolveOperandColumnKey(reference, summable);
}

function normalizeAiColumn(
  raw: Partial<FmsTableColumn>,
  forceCalculated = false,
): FmsTableColumn | null {
  const normalized = normalizeTableColumn({
    ...raw,
    columnType: forceCalculated ? "CALCULATED" : raw.columnType,
  });
  if (!normalized) {
    return null;
  }
  if (forceCalculated) {
    normalized.columnType = "CALCULATED";
    normalized.required = false;
  }
  return normalized;
}

export function normalizeTableCalcAiResponse(
  raw: Record<string, unknown>,
): TableCalcAiSuggestion | null {
  const explanation =
    typeof raw.explanation === "string" ? raw.explanation.trim() : "";
  if (!explanation) {
    return null;
  }

  const columns = Array.isArray(raw.columns)
    ? raw.columns
        .map((column) =>
          typeof column === "object" && column !== null
            ? normalizeAiColumn(column as Partial<FmsTableColumn>, true)
            : null,
        )
        .filter((column): column is FmsTableColumn => column !== null)
    : undefined;

  const newColumns = Array.isArray(raw.newColumns)
    ? raw.newColumns
        .map((column) =>
          typeof column === "object" && column !== null
            ? normalizeAiColumn(column as Partial<FmsTableColumn>)
            : null,
        )
        .filter(
          (column): column is FmsTableColumn =>
            column !== null && column.columnType === "NUMBER",
        )
    : undefined;

  const footerTotals = Array.isArray(raw.footerTotals)
    ? raw.footerTotals
        .map((total) => normalizeTableFooterTotal(total))
        .filter((total): total is FmsTableFooterTotal => total !== null)
    : undefined;

  if (!columns?.length && !newColumns?.length && !footerTotals?.length) {
    return null;
  }

  return {
    explanation,
    columns,
    newColumns,
    footerTotals,
  };
}

export function buildTableCalcAiContext(
  columns: FmsTableColumn[],
  footerTotals: FmsTableFooterTotal[],
) {
  return {
    columns: columns.map((column) => ({
      key: column.key,
      label: column.label,
      columnType: column.columnType,
      formula: column.formula,
    })),
    footerTotals,
  };
}

export function validateTableCalcPrerequisites(columns: FmsTableColumn[]) {
  const numberColumns = numericSourceColumns(columns);
  if (numberColumns.length === 0) {
    return {
      ok: false as const,
      message:
        "Add at least one Number column (e.g. Quantity, Rate) before setting up calculations.",
    };
  }
  return { ok: true as const };
}

export function applyTableCalcSuggestion(
  currentColumns: FmsTableColumn[],
  currentFooterTotals: FmsTableFooterTotal[],
  suggestion: TableCalcAiSuggestion,
): TableCalcAiApplyResult {
  let columns = currentColumns.map((column) => ({ ...column }));
  const appliedColumnKeys: string[] = [];

  for (const raw of suggestion.newColumns ?? []) {
    const normalized = normalizeAiColumn(raw);
    if (!normalized || normalized.columnType !== "NUMBER") {
      continue;
    }
    if (columns.some((column) => column.key === normalized.key)) {
      continue;
    }
    columns.push(normalized);
    appliedColumnKeys.push(normalized.key);
  }

  for (const raw of suggestion.columns ?? []) {
    const normalized = normalizeAiColumn(raw, true);
    if (!normalized || !normalized.formula) {
      continue;
    }

    const operandKeys = normalized.formula.operandKeys
      .map((key) => resolveOperandColumnKey(key, columns))
      .filter((key): key is string => Boolean(key));

    if (operandKeys.length < 2) {
      return {
        ok: false,
        message:
          "Could not match all columns for this formula. Add the missing number columns or try again with clearer names.",
      };
    }

    normalized.formula = {
      ...normalized.formula,
      operandKeys,
    };

    const existingIndex = columns.findIndex(
      (column) => column.key === normalized.key,
    );
    if (existingIndex >= 0) {
      columns[existingIndex] = {
        ...columns[existingIndex],
        ...normalized,
        formula: normalized.formula,
      };
    } else {
      columns.push(normalized);
    }
    appliedColumnKeys.push(normalized.key);
  }

  let footerTotals = currentFooterTotals.map((total) => ({ ...total }));
  for (const raw of suggestion.footerTotals ?? []) {
    const normalized = normalizeTableFooterTotal(raw);
    if (!normalized) {
      continue;
    }
    const columnKey = resolveFooterColumnKey(normalized.columnKey, columns);
    if (!columnKey) {
      return {
        ok: false,
        message:
          "Could not find a column to sum for the table total. Create the calculated column first.",
      };
    }
    const nextTotal = { ...normalized, columnKey };
    const existingIndex = footerTotals.findIndex(
      (total) => total.key === nextTotal.key,
    );
    if (existingIndex >= 0) {
      footerTotals[existingIndex] = nextTotal;
    } else {
      footerTotals.push(nextTotal);
    }
  }

  if (appliedColumnKeys.length === 0 && !suggestion.footerTotals?.length) {
    return {
      ok: false,
      message: "Nothing to apply. Try describing qty x rate or a grand total.",
    };
  }

  return {
    ok: true,
    columns,
    footerTotals,
    appliedColumnKeys,
    explanation: suggestion.explanation,
  };
}
