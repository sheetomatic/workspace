"use client";

import { useId, useState } from "react";
import { comboSuggestions } from "@/lib/mobile-shop/addable";

function fold(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

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
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [extra, setExtra] = useState<string[]>([]);
  const allOptions = [...options];
  for (const item of extra) {
    if (!allOptions.some((option) => fold(option) === fold(item))) {
      allOptions.push(item);
    }
  }
  const { hits } = comboSuggestions(allOptions, value);
  const show = !adding && open && hits.length > 0;

  function commit(raw: string) {
    const next = raw.trim();
    if (!next) return;
    onChange(next);
    if (!allOptions.some((option) => fold(option) === fold(next))) {
      setExtra((prev) =>
        prev.some((item) => fold(item) === fold(next)) ? prev : [...prev, next],
      );
    }
    setAdding(false);
    setDraft("");
    setOpen(false);
  }

  function startAdd() {
    const typed = value.trim();
    const listed = typed && allOptions.some((option) => fold(option) === fold(typed));
    setDraft(listed ? "" : typed);
    setAdding(true);
    setOpen(false);
  }

  return (
    <div className="ms-shop-combo">
      <div className="ms-shop-combo-row">
        <input
          name={name}
          value={value}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          onFocus={() => {
            if (!adding) setOpen(true);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
        />
        <button
          type="button"
          className="ms-shop-combo-add"
          data-ms-add-new=""
          aria-label="Add / New"
          onMouseDown={(event) => event.preventDefault()}
          onClick={startAdd}
        >
          Add / New
          <small>नया</small>
        </button>
      </div>
      {adding ? (
        <div className="ms-shop-combo-new">
          <p>Type a value that is not listed, then save and keep going.</p>
          <input
            value={draft}
            autoFocus
            placeholder="Type new · नया लिखें"
            autoComplete="off"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit(draft);
              }
            }}
          />
          <button
            type="button"
            className="ms-shop-combo-add"
            onClick={() => commit(draft)}
          >
            Save · सेव
          </button>
        </div>
      ) : null}
      {show ? (
        <ul className="ms-shop-suggest" id={listId} role="listbox">
          {hits.map((hit) => (
            <li key={hit}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(hit);
                  setAdding(false);
                  setOpen(false);
                }}
              >
                {hit}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
