"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "sheetomatic-workspace-pwa-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isMobileDevice() {
  if (typeof window === "undefined") {
    return false;
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function WorkspacePwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!isMobileDevice() || isStandaloneMode()) {
      return;
    }

    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!deferredPrompt || dismissed || isStandaloneMode()) {
    return null;
  }

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferredPrompt) {
      return;
    }
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      dismiss();
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="ws-pwa-install-banner" role="region" aria-label="Install workspace app">
      <div className="ws-pwa-install-banner-text">
        <strong>Install Sheetomatic</strong>
        <span>Add the workspace to your home screen for quick access.</span>
      </div>
      <div className="ws-pwa-install-banner-actions">
        <button
          className="btn-cta btn-primary ws-pwa-install-btn"
          disabled={installing}
          onClick={() => void install()}
          type="button"
        >
          <Download size={16} />
          {installing ? "Installing..." : "Install"}
        </button>
        <button
          aria-label="Dismiss install prompt"
          className="ws-pwa-install-dismiss"
          onClick={dismiss}
          type="button"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
