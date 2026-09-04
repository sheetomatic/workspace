"use client";

import { useState } from "react";
import { ShopCombo } from "@/components/saas/mobile-shop-combo";

export function ShopPickField({
  name,
  label,
  options,
  placeholder,
  required,
  defaultValue = "",
}: {
  name: string;
  label: string;
  options: readonly string[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <label>
      {label}
      <ShopCombo
        name={name}
        value={value}
        onChange={setValue}
        options={[...options]}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

export function JobTypeField({ options }: { options: readonly string[] }) {
  return (
    <ShopPickField
      name="jobType"
      label="Job"
      options={options}
      defaultValue={options[0] ?? "Other"}
      placeholder="Screen / battery / other"
      required
    />
  );
}
