import type {
  FmsTableColumn,
  FmsTableFooterTotal,
  FmsTableFormulaOp,
  FmsTableRow,
} from "@/lib/fms/constants";
import { isCalculatedTableColumn } from "@/lib/fms/constants";

function parseNumeric(value: unknown): number | null {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function formatCalculated(value: number, decimals = 2): string {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  if (decimals === 0) {
    return String(rounded);
  }
  return rounded.toFixed(decimals).replace(/\.?0+$/, "") || "0";
}

export function computeRowFormula(
  row: FmsTableRow,
  column: FmsTableColumn,
): string {
  if (!isCalculatedTableColumn(column) || !column.formula) {
    return String(row[column.key] ?? "");
  }

  const { operation, operandKeys, decimals = 2 } = column.formula;
  // Keep operands positional so SUBTRACT / DIVIDE use the correct sides even
  // when an earlier cell is blank or non-numeric.
  const operands = operandKeys.map((key) => parseNumeric(row[key]));
  const numericOperands = operands.filter(
    (value): value is number => value !== null,
  );

  let result: number | null = null;
  switch (operation as FmsTableFormulaOp) {
    case "MULTIPLY":
      // Every referenced cell must be numeric, otherwise the product is
      // misleading (e.g. qty x rate with a blank rate).
      result =
        operands.length >= 2 && operands.every((value) => value !== null)
          ? operands.reduce<number>((acc, value) => acc * (value as number), 1)
          : null;
      break;
    case "ADD":
      result =
        operands.length >= 2 && operands.every((value) => value !== null)
          ? operands.reduce<number>((acc, value) => acc + (value as number), 0)
          : null;
      break;
    case "SUBTRACT":
      result =
        operands.length >= 2 &&
        operands[0] !== null &&
        operands[1] !== null
          ? (operands[0] as number) - (operands[1] as number)
          : null;
      break;
    case "DIVIDE":
      result =
        operands.length >= 2 &&
        operands[0] !== null &&
        operands[1] !== null &&
        operands[1] !== 0
          ? (operands[0] as number) / (operands[1] as number)
          : null;
      break;
    case "SUM":
      // Sum tolerates blanks - it adds up whatever numeric cells exist.
      result =
        numericOperands.length > 0
          ? numericOperands.reduce((acc, value) => acc + value, 0)
          : null;
      break;
    default:
      result = null;
  }

  if (result === null || !Number.isFinite(result)) {
    return "";
  }

  return formatCalculated(result, decimals);
}

export function applyTableRowCalculations(
  row: FmsTableRow,
  columns: FmsTableColumn[],
): FmsTableRow {
  const next = { ...row };
  const calculatedColumns = columns.filter((column) =>
    isCalculatedTableColumn(column),
  );
  if (calculatedColumns.length === 0) {
    return next;
  }
  // Recompute repeatedly so a calculated column can reference another
  // calculated column regardless of their order (e.g. line total -> total
  // with GST). Stop once a pass changes nothing or the safety cap is hit.
  const maxPasses = calculatedColumns.length;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let changed = false;
    for (const column of calculatedColumns) {
      const computed = computeRowFormula(next, column);
      if (computed !== next[column.key]) {
        next[column.key] = computed;
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  return next;
}

export function applyTableCalculations(
  rows: FmsTableRow[],
  columns: FmsTableColumn[],
): FmsTableRow[] {
  return rows.map((row) => applyTableRowCalculations(row, columns));
}

export function computeFooterTotal(
  rows: FmsTableRow[],
  columns: FmsTableColumn[],
  total: FmsTableFooterTotal,
): string {
  const computedRows = applyTableCalculations(rows, columns);
  const values = computedRows
    .map((row) => parseNumeric(row[total.columnKey]))
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return "";
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  const decimals = total.decimals ?? 2;
  return formatCalculated(sum, decimals);
}

export function formulaOperationLabel(operation: FmsTableFormulaOp): string {
  switch (operation) {
    case "MULTIPLY":
      return "Multiply";
    case "ADD":
      return "Add";
    case "SUBTRACT":
      return "Subtract";
    case "DIVIDE":
      return "Divide";
    case "SUM":
      return "Sum";
    default:
      return operation;
  }
}

function operandLabel(
  key: string,
  columns?: FmsTableColumn[],
): string {
  if (!columns?.length) {
    return key;
  }
  const match = columns.find((column) => column.key === key);
  return match?.label?.trim() || key;
}

export function describeColumnFormula(
  column: FmsTableColumn,
  columns?: FmsTableColumn[],
): string {
  if (!isCalculatedTableColumn(column) || !column.formula) {
    return "";
  }
  const op = formulaOperationLabel(column.formula.operation).toLowerCase();
  const parts = column.formula.operandKeys.map((key) =>
    operandLabel(key, columns),
  );
  if (parts.length >= 2) {
    switch (column.formula.operation) {
      case "MULTIPLY":
        return `${parts[0]} x ${parts.slice(1).join(" x ")}`;
      case "ADD":
        return parts.join(" + ");
      case "SUBTRACT":
        return `${parts[0]} - ${parts[1]}`;
      case "DIVIDE":
        return `${parts[0]} / ${parts[1]}`;
      default:
        break;
    }
  }
  return `${op} (${parts.join(", ")})`;
}

export function numericSourceColumns(columns: FmsTableColumn[]) {
  return columns.filter((column) => column.columnType === "NUMBER");
}

export function summableTableColumns(columns: FmsTableColumn[]) {
  return columns.filter(
    (column) =>
      column.columnType === "NUMBER" || isCalculatedTableColumn(column),
  );
}
