"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { shouldShowSiteAssistant } from "@/lib/site-assistant/visibility";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import { parseHost } from "@/lib/subdomain";
import { aiPortalOrigin } from "@/lib/workspace-auth-links";
import "./sheetomatic-ai-launcher.css";

const STORAGE_KEY = "sheetomatic-ai-launcher-pos";
const LAUNCHER_SIZE = 40;
const DRAG_THRESHOLD_PX = 6;

type LauncherPosition = { x: number; y: number };

function resolveAiLauncherHref(hostname: string, protocol: string): string {
  const { kind } = parseHost(hostname);

  if (kind === "ai") {
    return "/ai/app";
  }

  if (kind === "workspace" || kind === "tenant") {
    return `${aiPortalOrigin(protocol.replace(":", ""))}/ai/app`;
  }

  return "/ai";
}

function subscribeToHostname(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getLauncherSnapshot() {
  return resolveAiLauncherHref(window.location.hostname, window.location.protocol);
}

function getLauncherServerSnapshot() {
  return "/ai";
}

function readStoredPosition(): LauncherPosition | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as LauncherPosition;
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return parsed;
    }
  } catch {
    // ignore corrupt storage
  }
  return null;
}

function defaultPosition(): LauncherPosition {
  const margin = 16;
  const mobileNavOffset =
    window.matchMedia("(max-width: 640px)").matches ? 68 : 0;
  const safeBottom = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      "env(safe-area-inset-bottom)",
    ) || "0",
  );
  const size =
    window.matchMedia("(max-width: 640px)").matches ? 38 : LAUNCHER_SIZE;

  return {
    x: Math.max(margin, window.innerWidth - size - margin),
    y: Math.max(
      margin,
      window.innerHeight - size - margin - mobileNavOffset - safeBottom,
    ),
  };
}

function clampPosition(position: LauncherPosition, size: number): LauncherPosition {
  const margin = 8;
  return {
    x: Math.min(Math.max(margin, position.x), window.innerWidth - size - margin),
    y: Math.min(Math.max(margin, position.y), window.innerHeight - size - margin),
  };
}

export function SheetomaticAiLauncher() {
  const pathname = usePathname() || "/";
  const href = useSyncExternalStore(
    subscribeToHostname,
    getLauncherSnapshot,
    getLauncherServerSnapshot,
  );
  const hostname = useSyncExternalStore(
    subscribeToHostname,
    () => window.location.hostname,
    () => "sheetomatic.com",
  );
  /** Avoid two FABs on marketing — Ask Sheetomatic owns that surface. */
  const hideForSiteGuide = shouldShowSiteAssistant(pathname, hostname);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<LauncherPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const blockClickRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const stored = readStoredPosition();
    const next = clampPosition(stored ?? defaultPosition(), LAUNCHER_SIZE);
    setPosition(next);
  }, []);

  useEffect(() => {
    function onResize() {
      setPosition((current) =>
        current ? clampPosition(current, LAUNCHER_SIZE) : current,
      );
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const persistPosition = useCallback((next: LauncherPosition) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage may be unavailable
    }
  }, []);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !position) {
      return;
    }
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      moved: false,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (
      !drag.moved &&
      Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD_PX
    ) {
      drag.moved = true;
    }
    const next = clampPosition(
      { x: drag.originX + deltaX, y: drag.originY + deltaY },
      LAUNCHER_SIZE,
    );
    setPosition(next);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const next = clampPosition(
      { x: drag.originX + deltaX, y: drag.originY + deltaY },
      LAUNCHER_SIZE,
    );
    setPosition(next);
    persistPosition(next);
    dragRef.current = null;
    blockClickRef.current = drag.moved;
    setIsDragging(false);
  }

  if (!position || hideForSiteGuide) {
    return null;
  }

  return (
    <div
      ref={wrapRef}
      className={`sheetomatic-ai-launcher-wrap${isDragging ? " is-dragging" : ""}`}
      style={{ left: position.x, top: position.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <Link
        className="sheetomatic-ai-launcher"
        href={href}
        aria-label="Open Sheetomatic AI"
        title="Sheetomatic AI — drag to move"
        draggable={false}
        onClick={(event) => {
          if (blockClickRef.current) {
            event.preventDefault();
            blockClickRef.current = false;
          }
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        <SheetomaticAiMark variant="icon" sizes="sm" />
        <span className="sheetomatic-ai-launcher-label">Sheetomatic AI</span>
      </Link>
    </div>
  );
}
