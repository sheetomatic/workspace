"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import { parseHost } from "@/lib/subdomain";
import { aiPortalOrigin } from "@/lib/workspace-auth-links";
import "./sheetomatic-ai-launcher.css";

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

export function SheetomaticAiLauncher() {
  const href = useSyncExternalStore(
    subscribeToHostname,
    getLauncherSnapshot,
    getLauncherServerSnapshot,
  );

  return (
    <Link
      className="sheetomatic-ai-launcher"
      href={href}
      aria-label="Open Sheetomatic AI"
    >
      <SheetomaticAiMark variant="icon" sizes="md" />
      <span className="sheetomatic-ai-launcher-label">Sheetomatic AI</span>
    </Link>
  );
}
