"use client";

import { useEffect } from "react";

/**
 * CRM page scroll fix: wheel events over nested overflow containers (or leftover
 * overflow locks) often fail to move #main — only the right-edge scrollbar gutter
 * works. Forward vertical wheel to #main unless a real nested vertical scroller
 * (drawer body, etc.) can consume it.
 */
export function LeadsPageScrollBridge() {
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;

    // Clear any stuck inline overflow lock from older drawer code.
    main.style.removeProperty("overflow");
    main.style.removeProperty("overflow-x");
    main.style.removeProperty("overflow-y");
    document.body.style.removeProperty("overflow");

    const canScrollY = (el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      const oy = style.overflowY;
      if (oy !== "auto" && oy !== "scroll" && oy !== "overlay") return false;
      return el.scrollHeight > el.clientHeight + 1;
    };

    const nestedScrollerCanHandle = (target: EventTarget | null, deltaY: number) => {
      let el = target instanceof HTMLElement ? target : null;
      while (el && el !== main) {
        if (canScrollY(el)) {
          const max = el.scrollHeight - el.clientHeight;
          const top = el.scrollTop;
          if (deltaY < 0 && top > 0) return true;
          if (deltaY > 0 && top < max - 1) return true;
          // At boundary — let page take over
        }
        el = el.parentElement;
      }
      return false;
    };

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.defaultPrevented) return;
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;

      const target = event.target;
      const inDrawer = target instanceof Element
        ? target.closest(".leads-drawer-backdrop")
        : null;
      if (inDrawer) {
        // Drawer is fixed; only its body should scroll — never move the page under it.
        if (
          target instanceof Element &&
          !target.closest(".leads-drawer-body") &&
          !nestedScrollerCanHandle(target, event.deltaY)
        ) {
          event.preventDefault();
        }
        return;
      }

      if (nestedScrollerCanHandle(event.target, event.deltaY)) return;

      const max = main.scrollHeight - main.clientHeight;
      if (max <= 0) return;

      const next = Math.min(max, Math.max(0, main.scrollTop + event.deltaY));
      if (next === main.scrollTop) return;

      event.preventDefault();
      main.scrollTop = next;
    };

    main.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      main.removeEventListener("wheel", onWheel, true);
    };
  }, []);

  return null;
}
