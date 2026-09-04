"use client";

import { useState } from "react";
import { ShopCombo } from "@/components/saas/mobile-shop-combo";

export function PartPickField({
  parts,
}: {
  parts: Array<{ id: string; name: string; qty: number }>;
}) {
  const [name, setName] = useState(parts[0]?.name ?? "");
  const selected = parts.find((part) => part.name === name);
  return (
    <>
      <label>
        Part
        <ShopCombo
          value={name}
          onChange={setName}
          options={parts.map((part) => part.name)}
          placeholder="A15 screen"
        />
      </label>
      <input name="itemId" type="hidden" value={selected?.id ?? ""} />
      {name && !selected ? (
        <p className="ms-shop-empty">
          “{name}” is not in stock — add it on Stock in, then take it here.
        </p>
      ) : null}
    </>
  );
}
