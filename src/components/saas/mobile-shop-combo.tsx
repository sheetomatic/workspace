"use client";

import { useId, useState } from "react";
import { comboSuggestions } from "@/lib/mobile-shop/addable";

export function ShopCombo({
  name,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const { hits, addNew } = comboSuggestions(options, value);
  const show = open && (hits.length > 0 || addNew);

  return (
    <div className="ms-shop-combo">
      <input
        name={name}
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={listId}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
      />
      {show ? (
        <ul className="ms-shop-suggest" id={listId} role="listbox">
          {hits.map((hit) => (
            <li key={hit}>
              <button type="button" onMouseDown={() => onChange(hit)}>
                {hit}
              </button>
            </li>
          ))}
          {addNew ? (
            <li>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(addNew);
                  setOpen(false);
                }}
              >
                Add new · {addNew}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
