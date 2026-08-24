"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getAgency, subscribe, type Agency } from "./data";

export function useAgency(): Agency {
  const [a, setA] = useState(getAgency);
  useEffect(() => subscribe(() => setA({ ...getAgency() })), []);
  return a;
}

export function Pill({ children, on }: { children: ReactNode; on?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: on ? "var(--pp-soft)" : "#1a2433", color: on ? "var(--pp-dark)" : "var(--muted)" }}>{children}</span>
  );
}
