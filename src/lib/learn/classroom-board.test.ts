import { describe, expect, it } from "vitest";
import {
  cellKey,
  colLetters,
  displayCell,
  evaluateFormula,
  parseA1,
  parseClassroomBoard,
  shopSampleBoard,
} from "@/lib/learn/classroom-board";

describe("classroom board sheet", () => {
  it("maps A1-style keys", () => {
    expect(colLetters(0)).toBe("A");
    expect(colLetters(11)).toBe("L");
    expect(cellKey(3, 5)).toBe("D6");
    expect(parseA1("d6")).toEqual({ col: 3, row: 5 });
  });

  it("evaluates teaching formulas", () => {
    const cells = { B2: "12", C2: "18", D2: "=B2*C2", D3: "980", D4: "1900" };
    expect(evaluateFormula("B2*C2", cells)).toBe(216);
    expect(evaluateFormula("SUM(D2:D4)", cells)).toBe(3096);
    expect(displayCell("=B2*C2", cells)).toBe("216");
  });

  it("loads the shop sample with a working total", () => {
    const board = shopSampleBoard();
    expect(displayCell(board.sheet.cells.D2, board.sheet.cells)).toBe("216");
    expect(displayCell(board.sheet.cells.D6, board.sheet.cells)).toBe("3096");
  });

  it("rejects a junk payload", () => {
    const board = parseClassroomBoard({ mode: "hack", strokes: "nope" });
    expect(board.mode).toBe("sheet");
    expect(board.strokes).toEqual([]);
  });
});
