import type { CellValue, SheetRow } from "./index";

export type FormulaTables = Record<string, SheetRow[]>;

export type FormulaContext = {
  row: Record<string, CellValue>;
  user?: string | null;
  tables?: FormulaTables;
};

function asText(value: CellValue) {
  return value == null ? "" : String(value);
}

function asNum(value: CellValue) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function cellOf(row: Record<string, CellValue>, name: string): CellValue {
  if (name in row) return row[name];
  const want = name.trim().toLowerCase();
  const hit = Object.keys(row).find((key) => key.toLowerCase() === want);
  return hit ? row[hit] : "";
}

function truthy(value: CellValue) {
  if (typeof value === "boolean") return value;
  const text = asText(value).trim().toLowerCase();
  if (!text || text === "false" || text === "0") return false;
  return true;
}

export function suggestAppSheetFormula(prompt: string, headers: string[]): string {
  const q = prompt.trim().toLowerCase();
  const name = headers.find((h) => /name|lead|party/i.test(h)) || headers[0] || "Name";
  const company = headers.find((h) => /company|party|org/i.test(h));
  const stage = headers.find((h) => /stage|status/i.test(h));
  const value = headers.find((h) => /value|amount|total|qty/i.test(h));
  if (/concat|combine|full name|label|title/i.test(q) && company) {
    return `CONCATENATE([${name}]," — ",[${company}])`;
  }
  if (/won|closed|if/i.test(q) && stage) {
    return `IF([${stage}]="Won","Closed","Open")`;
  }
  if (/blank|empty/i.test(q) && stage) {
    return `IF(ISBLANK([${stage}]),"New",[${stage}])`;
  }
  if (value && /number|amount|value/i.test(q)) {
    return `NUMBER([${value}])`;
  }
  if (company) return `CONCATENATE([${name}]," — ",[${company}])`;
  return `[${name}]`;
}

class Parser {
  text: string;
  i = 0;
  ctx: FormulaContext;

  constructor(text: string, ctx: FormulaContext) {
    this.text = text.replace(/^\s*=/, "").trim();
    this.ctx = ctx;
  }

  peek() {
    return this.text[this.i] || "";
  }

  skip() {
    while (/\s/.test(this.peek())) this.i += 1;
  }

  eat(want: string) {
    this.skip();
    if (this.text.slice(this.i, this.i + want.length).toLowerCase() !== want.toLowerCase()) {
      throw new Error(`Expected ${want}`);
    }
    this.i += want.length;
  }

  parse(): CellValue {
    const value = this.orExpr();
    this.skip();
    if (this.i < this.text.length) throw new Error("Unexpected formula text");
    return value;
  }

  orExpr(): CellValue {
    let left = this.andExpr();
    for (;;) {
      this.skip();
      if (this.text.slice(this.i, this.i + 2).toUpperCase() === "OR" && /\W/.test(this.text[this.i + 2] || " ")) {
        this.i += 2;
        left = truthy(left) || truthy(this.andExpr());
      } else break;
    }
    return left;
  }

  andExpr(): CellValue {
    let left = this.cmpExpr();
    for (;;) {
      this.skip();
      if (this.text.slice(this.i, this.i + 3).toUpperCase() === "AND" && /\W/.test(this.text[this.i + 3] || " ")) {
        this.i += 3;
        left = truthy(left) && truthy(this.cmpExpr());
      } else break;
    }
    return left;
  }

  cmpExpr(): CellValue {
    let left = this.concatExpr();
    this.skip();
    const op = ["<>", ">=", "<=", "=", ">", "<"].find((item) =>
      this.text.startsWith(item, this.i),
    );
    if (!op) return left;
    this.i += op.length;
    const right = this.concatExpr();
    if (op === "=") return asText(left) === asText(right);
    if (op === "<>") return asText(left) !== asText(right);
    const a = asNum(left);
    const b = asNum(right);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    if (op === ">") return a > b;
    if (op === "<") return a < b;
    if (op === ">=") return a >= b;
    return a <= b;
  }

  concatExpr(): CellValue {
    let left = this.addExpr();
    for (;;) {
      this.skip();
      if (this.peek() !== "&") break;
      this.i += 1;
      left = `${asText(left)}${asText(this.addExpr())}`;
    }
    return left;
  }

  addExpr(): CellValue {
    let left = this.mulExpr();
    for (;;) {
      this.skip();
      const op = this.peek();
      if (op !== "+" && op !== "-") break;
      this.i += 1;
      const right = this.mulExpr();
      const a = asNum(left);
      const b = asNum(right);
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        left = op === "+" ? `${asText(left)}${asText(right)}` : "";
      } else {
        left = op === "+" ? a + b : a - b;
      }
    }
    return left;
  }

  mulExpr(): CellValue {
    let left = this.unary();
    for (;;) {
      this.skip();
      const op = this.peek();
      if (op !== "*" && op !== "/") break;
      this.i += 1;
      const right = this.unary();
      const a = asNum(left);
      const b = asNum(right);
      if (!Number.isFinite(a) || !Number.isFinite(b) || (op === "/" && b === 0)) {
        left = "";
      } else {
        left = op === "*" ? a * b : Math.round((a / b) * 100) / 100;
      }
    }
    return left;
  }

  unary(): CellValue {
    this.skip();
    if (this.peek() === "-") {
      this.i += 1;
      const n = asNum(this.unary());
      return Number.isFinite(n) ? -n : "";
    }
    if (this.peek() === "+") {
      this.i += 1;
      return this.unary();
    }
    if (this.text.slice(this.i, this.i + 3).toUpperCase() === "NOT" && /\W/.test(this.text[this.i + 3] || " ")) {
      this.i += 3;
      return !truthy(this.unary());
    }
    return this.primary();
  }

  primary(): CellValue {
    this.skip();
    if (this.peek() === "[") {
      const end = this.text.indexOf("]", this.i + 1);
      if (end < 0) throw new Error("Unclosed [Column]");
      let name = this.text.slice(this.i + 1, end);
      this.i = end + 1;
      if (name.toUpperCase() === "_THISROW" && this.text[this.i] === ".") {
        this.i += 1;
        this.skip();
        if (this.peek() === "[") {
          const close = this.text.indexOf("]", this.i + 1);
          if (close < 0) throw new Error("Unclosed [Column]");
          name = this.text.slice(this.i + 1, close);
          this.i = close + 1;
        }
      }
      return cellOf(this.ctx.row, name);
    }
    if (this.peek() === '"' || this.peek() === "'") {
      const q = this.peek();
      this.i += 1;
      let out = "";
      while (this.i < this.text.length && this.text[this.i] !== q) {
        if (this.text[this.i] === "\\") this.i += 1;
        out += this.text[this.i] || "";
        this.i += 1;
      }
      this.i += 1;
      return out;
    }
    if (/[0-9.]/.test(this.peek())) {
      const start = this.i;
      while (/[0-9.]/.test(this.peek())) this.i += 1;
      return asNum(this.text.slice(start, this.i));
    }
    if (this.peek() === "(") {
      this.i += 1;
      const inner = this.orExpr();
      this.eat(")");
      return inner;
    }
    const start = this.i;
    while (/[A-Za-z_]/.test(this.peek())) this.i += 1;
    const name = this.text.slice(start, this.i).toUpperCase();
    if (name === "TRUE") return true;
    if (name === "FALSE") return false;
    if (this.peek() === "(") {
      this.i += 1;
      const args: CellValue[] = [];
      this.skip();
      if (this.peek() !== ")") {
        args.push(this.orExpr());
        this.skip();
        while (this.peek() === ",") {
          this.i += 1;
          args.push(this.orExpr());
          this.skip();
        }
      }
      this.eat(")");
      return this.call(name, args);
    }
    throw new Error(`Unknown token ${name || this.peek()}`);
  }

  call(name: string, args: CellValue[]): CellValue {
    switch (name) {
      case "CONCATENATE":
        return args.map(asText).join("");
      case "IF":
        return truthy(args[0]) ? (args[1] ?? "") : (args[2] ?? "");
      case "IFS": {
        for (let i = 0; i < args.length - 1; i += 2) {
          if (truthy(args[i]) || asText(args[i]).toUpperCase() === "TRUE") return args[i + 1] ?? "";
        }
        return "";
      }
      case "ISBLANK":
        return asText(args[0]).trim() === "";
      case "ISNOTBLANK":
        return asText(args[0]).trim() !== "";
      case "NUMBER":
      case "VALUE":
        return asNum(args[0]);
      case "TEXT":
        return asText(args[0]);
      case "UPPER":
        return asText(args[0]).toUpperCase();
      case "LOWER":
        return asText(args[0]).toLowerCase();
      case "TRIM":
        return asText(args[0]).trim();
      case "LEFT":
        return asText(args[0]).slice(0, Math.max(0, asNum(args[1]) || 0));
      case "RIGHT": {
        const text = asText(args[0]);
        const n = Math.max(0, asNum(args[1]) || 0);
        return text.slice(-n);
      }
      case "LEN":
        return asText(args[0]).length;
      case "NOW":
      case "TODAY":
        return new Date().toLocaleDateString("en-GB");
      case "USERNAME":
      case "USEREMAIL":
        return this.ctx.user || "Owner";
      case "UNIQUEID":
        return `row-${Date.now().toString(36)}`;
      case "LOOKUP": {
        const match = asText(args[0]);
        const table = asText(args[1]);
        const matchCol = asText(args[2]);
        const returnCol = asText(args[3]);
        const rows = this.ctx.tables?.[table] || [];
        const hit = rows.find((row) => asText(cellOf(row.cells, matchCol)) === match);
        return hit ? cellOf(hit.cells, returnCol) : "";
      }
      case "COUNT":
        return args.filter((item) => asText(item).trim() !== "").length;
      case "SUM":
        return args.reduce((sum, item) => sum + (asNum(item) || 0), 0);
      default:
        throw new Error(`Unsupported function ${name}`);
    }
  }
}

export function evaluateAppSheetFormula(formula: string, ctx: FormulaContext): CellValue {
  const text = formula.trim();
  if (!text) return "";
  try {
    return new Parser(text, ctx).parse();
  } catch {
    return "";
  }
}
