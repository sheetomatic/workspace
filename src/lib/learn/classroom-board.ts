export const BOARD_COLS = 12;
export const BOARD_ROWS = 24;

export type BoardMode = "draw" | "sheet";

export type BoardStroke = {
  id: string;
  color: string;
  width: number;
  erase?: boolean;
  points: number[];
};

export type SheetState = {
  cols: number;
  rows: number;
  cells: Record<string, string>;
  active: string | null;
};

export type ClassroomBoard = {
  v: 1;
  mode: BoardMode;
  strokes: BoardStroke[];
  sheet: SheetState;
};

export function emptyClassroomBoard(): ClassroomBoard {
  return {
    v: 1,
    mode: "sheet",
    strokes: [],
    sheet: {
      cols: BOARD_COLS,
      rows: BOARD_ROWS,
      cells: {},
      active: "A1",
    },
  };
}

export function shopSampleBoard(): ClassroomBoard {
  const board = emptyClassroomBoard();
  board.mode = "sheet";
  board.sheet.cells = {
    A1: "Item",
    B1: "Qty",
    C1: "Rate",
    D1: "Amount",
    A2: "1.5 sqmm wire",
    B2: "12",
    C2: "18",
    D2: "=B2*C2",
    A3: "MCB 32A",
    B3: "4",
    C3: "245",
    D3: "=B3*C3",
    A4: "LED 20W",
    B4: "20",
    C4: "95",
    D4: "=B4*C4",
    A6: "Total",
    D6: "=SUM(D2:D4)",
  };
  board.sheet.active = "D6";
  return board;
}

export function colLetters(index: number) {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

export function colIndex(letters: string) {
  let n = 0;
  for (const ch of letters.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

export function cellKey(col: number, row: number) {
  return `${colLetters(col)}${row + 1}`;
}

export function parseA1(ref: string) {
  const match = ref.trim().toUpperCase().match(/^([A-Z]{1,2})(\d{1,3})$/);
  if (!match) return null;
  return { col: colIndex(match[1]!), row: Number(match[2]) - 1 };
}

function expandRange(range: string) {
  const [startRaw, endRaw] = range.split(":");
  const start = parseA1(startRaw ?? "");
  const end = parseA1(endRaw ?? startRaw ?? "");
  if (!start || !end) return [];
  const keys: string[] = [];
  const c0 = Math.min(start.col, end.col);
  const c1 = Math.max(start.col, end.col);
  const r0 = Math.min(start.row, end.row);
  const r1 = Math.max(start.row, end.row);
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      keys.push(cellKey(col, row));
    }
  }
  return keys;
}

function numericValue(
  raw: string | undefined,
  cells: Record<string, string>,
  depth: number,
): number {
  if (!raw?.trim()) return 0;
  if (raw.startsWith("=")) {
    return evaluateFormula(raw.slice(1), cells, depth + 1) ?? 0;
  }
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function tokenize(expr: string) {
  const tokens: string[] = [];
  const src = expr.replace(/\s+/g, "");
  const re =
    /SUM\([A-Z]{1,2}\d{1,3}(?::[A-Z]{1,2}\d{1,3})?\)|[A-Z]{1,2}\d{1,3}|-?\d+(?:\.\d+)?|[+\-*/()]/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src))) {
    tokens.push(match[0].toUpperCase());
  }
  return tokens;
}

function evaluateTokens(
  tokens: string[],
  cells: Record<string, string>,
  depth: number,
): number | null {
  let i = 0;

  function peek() {
    return tokens[i] ?? "";
  }
  function eat() {
    return tokens[i++] ?? "";
  }

  function parseFactor(): number {
    const token = eat();
    if (token === "(") {
      const inner = parseExpr();
      if (peek() === ")") eat();
      return inner;
    }
    if (token.startsWith("SUM(")) {
      const range = token.slice(4, -1);
      return expandRange(range).reduce(
        (sum, key) => sum + numericValue(cells[key], cells, depth),
        0,
      );
    }
    if (parseA1(token)) {
      return numericValue(cells[token], cells, depth);
    }
    const n = Number(token);
    return Number.isFinite(n) ? n : Number.NaN;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (peek() === "*" || peek() === "/") {
      const op = eat();
      const right = parseFactor();
      value = op === "*" ? value * right : right === 0 ? Number.NaN : value / right;
    }
    return value;
  }

  function parseExpr(): number {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = eat();
      const right = parseTerm();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  const value = parseExpr();
  return Number.isFinite(value) ? value : null;
}

export function evaluateFormula(
  expr: string,
  cells: Record<string, string>,
  depth = 0,
): number | null {
  if (depth > 8) return null;
  const tokens = tokenize(expr);
  if (tokens.length === 0) return null;
  return evaluateTokens(tokens, cells, depth);
}

export function displayCell(raw: string | undefined, cells: Record<string, string>) {
  if (!raw) return "";
  if (!raw.startsWith("=")) return raw;
  const value = evaluateFormula(raw.slice(1), cells);
  if (value == null) return "#VALUE!";
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

export function parseClassroomBoard(raw: unknown): ClassroomBoard {
  const empty = emptyClassroomBoard();
  if (!raw || typeof raw !== "object") return empty;
  const value = raw as Partial<ClassroomBoard>;
  const sheet = value.sheet && typeof value.sheet === "object" ? value.sheet : empty.sheet;
  const cells =
    sheet.cells && typeof sheet.cells === "object"
      ? Object.fromEntries(
          Object.entries(sheet.cells)
            .filter(([key, cell]) => parseA1(key) && typeof cell === "string")
            .slice(0, 400),
        )
      : {};
  const strokes = Array.isArray(value.strokes)
    ? value.strokes
        .filter((stroke) => stroke && Array.isArray(stroke.points))
        .slice(-120)
        .map((stroke) => ({
          id: String(stroke.id || "s"),
          color: String(stroke.color || "#111827"),
          width: Math.min(24, Math.max(1, Number(stroke.width) || 2)),
          erase: Boolean(stroke.erase),
          points: stroke.points.filter((n): n is number => Number.isFinite(n)).slice(0, 400),
        }))
    : [];
  return {
    v: 1,
    mode: value.mode === "draw" ? "draw" : "sheet",
    strokes,
    sheet: {
      cols: BOARD_COLS,
      rows: BOARD_ROWS,
      cells,
      active: sheet.active && parseA1(sheet.active) ? sheet.active.toUpperCase() : "A1",
    },
  };
}
