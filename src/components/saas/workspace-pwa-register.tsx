"use client";

import { useEffect } from "react";

const SW_URL = "/app/sw.js";
const SW_SCOPE = "/app/";

export function WorkspacePwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
      } catch (error) {
        console.warn("[workspace-pwa] Service worker registration failed", error);
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", () => void register(), { once: true });
    }
  }, []);

  return null;
}
