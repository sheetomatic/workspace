"use client";

import { useState } from "react";
import { ShopCombo } from "@/components/saas/mobile-shop-combo";

export function JobTypeField({ options }: { options: readonly string[] }) {
  const [value, setValue] = useState(options[0] ?? "Other");
  return (
    <label>
      Job
      <ShopCombo
        name="jobType"
        value={value}
        onChange={setValue}
        options={[...options]}
        placeholder="Screen / battery / other"
        required
      />
    </label>
  );
}
