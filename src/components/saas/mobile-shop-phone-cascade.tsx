"use client";

import { useMemo, useState } from "react";
import { ShopCombo } from "@/components/saas/mobile-shop-combo";
import {
  cascadeAfterPick,
  catalogColorsFor,
  catalogModelsFor,
  uniqueCatalogValues,
  uniquePhoneCatalog,
  type PhoneCatalogEntry,
  type PhonePick,
} from "@/lib/mobile-shop/phone-catalog";

function fold(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function ChipRow({
  options,
  value,
  onPick,
}: {
  options: string[];
  value: string;
  onPick: (value: string) => void;
}) {
  if (options.length === 0) return null;
  const shown = options.slice(0, 12);
  return (
    <div className="ms-shop-chips" role="list">
      {shown.map((option) => (
        <button
          type="button"
          key={option}
          className={fold(option) === fold(value) ? "is-active" : undefined}
          onClick={() => onPick(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function PhoneCascade({
  catalog,
  value,
  onChange,
  brandName,
  modelName,
  colorName,
  required,
}: {
  catalog: PhoneCatalogEntry[];
  value: PhonePick;
  onChange: (next: PhonePick) => void;
  brandName?: string;
  modelName?: string;
  colorName?: string;
  required?: boolean;
}) {
  const [extra, setExtra] = useState<PhoneCatalogEntry[]>([]);
  const merged = useMemo(
    () => uniquePhoneCatalog([...catalog, ...extra]),
    [catalog, extra],
  );

  function remember(next: PhonePick) {
    if (!next.brand.trim() && !next.model.trim()) return;
    setExtra((prev) => [
      ...prev,
      {
        brand: next.brand.trim(),
        model: next.model.trim(),
        color: next.color.trim(),
        condition: null,
      },
    ]);
  }

  function pick(field: keyof PhonePick, raw: string) {
    const next = cascadeAfterPick(merged, value, field, raw.trim());
    remember(next);
    onChange(next);
  }

  const brands = uniqueCatalogValues(merged, "brand");
  const models = catalogModelsFor(merged, value.brand);
  const colors = catalogColorsFor(merged, value.brand, value.model);
  const picked = [value.brand, value.model, value.color].filter(Boolean).join(" · ");

  return (
    <div className="ms-shop-cascade">
      <label>
        Family · मेक
        <ChipRow options={brands} value={value.brand} onPick={(brand) => pick("brand", brand)} />
        <ShopCombo
          name={brandName}
          value={value.brand}
          onChange={(brand) => pick("brand", brand)}
          options={brands}
          placeholder="Samsung / Redmi"
          required={required}
        />
      </label>
      <label>
        Model
        <ChipRow options={models} value={value.model} onPick={(model) => pick("model", model)} />
        <ShopCombo
          name={modelName}
          value={value.model}
          onChange={(model) => pick("model", model)}
          options={models}
          placeholder="A15"
          required={required}
        />
      </label>
      <label>
        Color · रंग
        <ChipRow options={colors} value={value.color} onPick={(color) => pick("color", color)} />
        <ShopCombo
          name={colorName}
          value={value.color}
          onChange={(color) => pick("color", color)}
          options={colors}
          placeholder="Black"
        />
      </label>
      {picked ? (
        <p className="ms-shop-picked">
          {picked}
        </p>
      ) : (
        <p className="ms-shop-empty">Pick family → model → color. Rest fills in.</p>
      )}
    </div>
  );
}
