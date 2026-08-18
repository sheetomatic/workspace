"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BOARD_COLS,
  BOARD_ROWS,
  cellKey,
  colLetters,
  displayCell,
  emptyClassroomBoard,
  parseA1,
  parseClassroomBoard,
  shopSampleBoard,
  type BoardMode,
  type BoardStroke,
  type ClassroomBoard,
} from "@/lib/learn/classroom-board";
import "@/components/learn/classroom-board.css";

const DRAW_COLORS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#d97706"];

export function ClassroomBoardPanel({
  slotId,
  canEdit,
}: {
  slotId: string;
  canEdit: boolean;
}) {
  const [board, setBoard] = useState<ClassroomBoard>(emptyClassroomBoard);
  const [rev, setRev] = useState(0);
  const [draft, setDraft] = useState("");
  const [color, setColor] = useState(DRAW_COLORS[0]!);
  const [tool, setTool] = useState<"pen" | "erase">("pen");
  const skipPoll = useRef(false);
  const pending = useRef<ClassroomBoard | null>(null);
  const saveTimer = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef<BoardStroke | null>(null);

  const applyRemote = useCallback((next: ClassroomBoard, nextRev: number) => {
    setBoard(next);
    setRev(nextRev);
    const active = next.sheet.active || "A1";
    setDraft(next.sheet.cells[active] ?? "");
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function pull() {
      if (skipPoll.current) return;
      const response = await fetch(
        `/api/learn/classroom/${slotId}/board?rev=${rev}`,
        { cache: "no-store" },
      );
      if (!response.ok || cancelled) return;
      const data = (await response.json()) as {
        rev: number;
        unchanged?: boolean;
        board?: ClassroomBoard;
      };
      if (data.unchanged || !data.board) return;
      applyRemote(parseClassroomBoard(data.board), data.rev);
    }
    void pull();
    const timer = window.setInterval(() => void pull(), canEdit ? 2500 : 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [slotId, rev, canEdit, applyRemote]);

  const persist = useCallback(
    (next: ClassroomBoard) => {
      if (!canEdit) return;
      pending.current = next;
      skipPoll.current = true;
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        const payload = pending.current;
        if (!payload) return;
        void fetch(`/api/learn/classroom/${slotId}/board`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ board: payload }),
        })
          .then(async (response) => {
            if (!response.ok) return;
            const data = (await response.json()) as { rev: number };
            setRev(data.rev);
          })
          .finally(() => {
            skipPoll.current = false;
          });
      }, 280);
    },
    [canEdit, slotId],
  );

  function commit(next: ClassroomBoard) {
    setBoard(next);
    persist(next);
  }

  function setMode(mode: BoardMode) {
    commit({ ...board, mode });
  }

  function setActive(key: string) {
    setDraft(board.sheet.cells[key] ?? "");
    commit({
      ...board,
      sheet: { ...board.sheet, active: key },
    });
  }

  function saveDraft(raw: string, move?: "down" | "right") {
    const active = board.sheet.active || "A1";
    const cells = { ...board.sheet.cells };
    if (raw.trim()) cells[active] = raw;
    else delete cells[active];
    let nextActive = active;
    const pos = parseA1(active);
    if (pos && move === "down") {
      nextActive = cellKey(pos.col, Math.min(BOARD_ROWS - 1, pos.row + 1));
    }
    if (pos && move === "right") {
      nextActive = cellKey(Math.min(BOARD_COLS - 1, pos.col + 1), pos.row);
    }
    setDraft(cells[nextActive] ?? "");
    commit({
      ...board,
      sheet: { ...board.sheet, cells, active: nextActive },
    });
  }

  function paint(strokes: BoardStroke[]) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of strokes) {
      if (stroke.points.length < 4) continue;
      ctx.strokeStyle = stroke.erase ? "#ffffff" : stroke.color;
      ctx.lineWidth = stroke.erase ? stroke.width * 3 : stroke.width;
      ctx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0]! * width, stroke.points[1]! * height);
      for (let i = 2; i < stroke.points.length; i += 2) {
        ctx.lineTo(stroke.points[i]! * width, stroke.points[i + 1]! * height);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  useEffect(() => {
    paint(board.strokes);
  }, [board.strokes]);

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const box = canvas.getBoundingClientRect();
    return [
      (event.clientX - box.left) / box.width,
      (event.clientY - box.top) / box.height,
    ] as const;
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!canEdit) return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = {
      id: `${Date.now()}`,
      color,
      width: tool === "erase" ? 8 : 2.5,
      erase: tool === "erase",
      points: [...point],
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const point = pointFromEvent(event);
    if (!point) return;
    drawing.current.points.push(point[0], point[1]);
    paint([...board.strokes, drawing.current]);
  }

  function onPointerUp() {
    if (!drawing.current) return;
    const stroke = drawing.current;
    drawing.current = null;
    commit({ ...board, strokes: [...board.strokes, stroke].slice(-120) });
  }

  const active = board.sheet.active || "A1";

  return (
    <section className="teach-board">
      <div className="teach-board-toolbar">
        <div className="teach-board-modes" role="tablist" aria-label="Board type">
          <button
            type="button"
            className={board.mode === "sheet" ? "is-active" : undefined}
            onClick={() => setMode("sheet")}
            disabled={!canEdit}
          >
            Spreadsheet
          </button>
          <button
            type="button"
            className={board.mode === "draw" ? "is-active" : undefined}
            onClick={() => setMode("draw")}
            disabled={!canEdit}
          >
            Whiteboard
          </button>
        </div>
        {canEdit && board.mode === "sheet" ? (
          <div className="teach-board-tools">
            <button type="button" onClick={() => commit(shopSampleBoard())}>
              Load shop sample
            </button>
            <button
              type="button"
              onClick={() => commit(emptyClassroomBoard())}
            >
              Clear sheet
            </button>
          </div>
        ) : null}
        {canEdit && board.mode === "draw" ? (
          <div className="teach-board-tools">
            <button
              type="button"
              className={tool === "pen" ? "is-active" : undefined}
              onClick={() => setTool("pen")}
            >
              Pen
            </button>
            <button
              type="button"
              className={tool === "erase" ? "is-active" : undefined}
              onClick={() => setTool("erase")}
            >
              Eraser
            </button>
            {DRAW_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={`teach-board-swatch${color === swatch ? " is-active" : ""}`}
                style={{ background: swatch }}
                aria-label={swatch}
                onClick={() => {
                  setColor(swatch);
                  setTool("pen");
                }}
              />
            ))}
            <button
              type="button"
              onClick={() => commit({ ...board, strokes: [] })}
            >
              Clear board
            </button>
          </div>
        ) : null}
        {!canEdit ? (
          <p className="teach-board-hint">Follow the trainer&apos;s board</p>
        ) : (
          <p className="teach-board-hint">Students see this board live</p>
        )}
      </div>

      {board.mode === "sheet" ? (
        <div className="teach-sheet">
          <div className="teach-sheet-formula">
            <strong>{active}</strong>
            {canEdit ? (
              <input
                value={draft}
                aria-label="Formula bar"
                placeholder="Value or =B2*C2"
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => saveDraft(draft)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    saveDraft(draft, "down");
                  }
                  if (event.key === "Tab") {
                    event.preventDefault();
                    saveDraft(draft, "right");
                  }
                }}
              />
            ) : (
              <span>{board.sheet.cells[active] || " "}</span>
            )}
          </div>
          <div className="teach-sheet-scroll">
            <table>
              <thead>
                <tr>
                  <th />
                  {Array.from({ length: BOARD_COLS }, (_, col) => (
                    <th key={col}>{colLetters(col)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: BOARD_ROWS }, (_, row) => (
                  <tr key={row}>
                    <th>{row + 1}</th>
                    {Array.from({ length: BOARD_COLS }, (_, col) => {
                      const key = cellKey(col, row);
                      const raw = board.sheet.cells[key] ?? "";
                      const selected = active === key;
                      const header = row === 0 && Boolean(raw);
                      return (
                        <td
                          key={key}
                          className={`${selected ? "is-active" : ""}${header ? " is-head" : ""}`}
                          onClick={() => canEdit && setActive(key)}
                        >
                          {displayCell(raw, board.sheet.cells)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className="teach-draw"
          width={1280}
          height={720}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      )}
    </section>
  );
}
