"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { formatInr } from "@/lib/leads/categories";

/** Salary stays masked until explicitly clicked (privacy on shared screens). */
export function MaskedSalary({ amount }: { amount: number }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      aria-label={revealed ? "Hide salary" : "Show salary"}
      className="saas-salary-mask"
      onClick={() => setRevealed((current) => !current)}
      title={revealed ? "Hide salary" : "Show salary"}
      type="button"
    >
      {revealed ? formatInr(amount) : "₹•••••"}
      {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
    </button>
  );
}
