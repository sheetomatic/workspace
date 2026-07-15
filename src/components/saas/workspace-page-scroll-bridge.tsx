"use client";

import { useEffect } from "react";

/**
 * Workspace page scroll fix: wheel over nested overflow containers often fails
 * to move the real page scrollport — only the right-edge scrollbar gutter works.
 * Forward vertical wheel to the active page scroller unless a real nested
 * vertical scroller (drawer body, dialog, etc.) can consume it.
 */
export function WorkspacePageScrollBridge({
  /** Prefer this scroller when present (e.g. .ws-module-layout-main). */
  preferSelector = ".ws-module-layout-main",
}: {
  preferSelector?: string;
} = {}) {
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;

    // Clear any stuck inline overflow lock from older drawer code.
    main.style.removeProperty("overflow");
    main.style.removeProperty("overflow-x");
    main.style.removeProperty("overflow-y");
    document.body.style.removeProperty("overflow");

    const resolveScrollport = (): HTMLElement => {
      const preferred =
        preferSelector && main.querySelector<HTMLElement>(preferSelector);
      if (preferred) {
        const style = window.getComputedStyle(preferred);
        const oy = style.overflowY;
        if (oy === "auto" || oy === "scroll" || oy === "overlay") {
          // Constrained module panel (flex child with min-height:0) is the page scroller.
          if (preferred.clientHeight > 0 && preferred.scrollHeight >= preferred.clientHeight) {
            const parentHidden =
              window.getComputedStyle(main).overflowY === "hidden" ||
              window.getComputedStyle(main).overflow === "hidden";
            if (parentHidden || preferred.scrollHeight > preferred.clientHeight + 1) {
              return preferred;
            }
          }
        }
      }
      return main;
    };

    const canScrollY = (el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      const oy = style.overflowY;
      if (oy !== "auto" && oy !== "scroll" && oy !== "overlay") return false;
      return el.scrollHeight > el.clientHeight + 1;
    };

    const nestedScrollerCanHandle = (
      target: EventTarget | null,
      deltaY: number,
      scrollport: HTMLElement,
    ) => {
      let el = target instanceof HTMLElement ? target : null;
      while (el && el !== scrollport && el !== main) {
        if (canScrollY(el)) {
          const max = el.scrollHeight - el.clientHeight;
          const top = el.scrollTop;
          if (deltaY < 0 && top > 0) return true;
          if (deltaY > 0 && top < max - 1) return true;
        }
        el = el.parentElement;
      }
      return false;
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.defaultPrevented) return;
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;

      const scrollport = resolveScrollport();
      const target = event.target;

      const inDrawer =
        target instanceof Element ? target.closest(".leads-drawer-backdrop") : null;
      if (inDrawer) {
        if (
          target instanceof Element &&
          !target.closest(".leads-drawer-body") &&
          !nestedScrollerCanHandle(target, event.deltaY, scrollport)
        ) {
          event.preventDefault();
        }
        return;
      }

      // Dialogs / modals with their own scroll
      if (
        target instanceof Element &&
        target.closest("[role='dialog'], .ws-modal, .saas-modal")
      ) {
        if (nestedScrollerCanHandle(target, event.deltaY, scrollport)) return;
      }

      if (nestedScrollerCanHandle(event.target, event.deltaY, scrollport)) return;

      const max = scrollport.scrollHeight - scrollport.clientHeight;
      if (max <= 0) return;

      const next = Math.min(max, Math.max(0, scrollport.scrollTop + event.deltaY));
      if (next === scrollport.scrollTop) return;

      event.preventDefault();
      scrollport.scrollTop = next;
    };

    // Capture on both main and window so settings/nested modules still receive wheels.
    main.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      main.removeEventListener("wheel", onWheel, true);
    };
  }, [preferSelector]);

  return null;
}

/** @deprecated Prefer WorkspacePageScrollBridge — kept for existing imports. */
export function LeadsPageScrollBridge() {
  return <WorkspacePageScrollBridge preferSelector=".ws-module-layout-main" />;
}
