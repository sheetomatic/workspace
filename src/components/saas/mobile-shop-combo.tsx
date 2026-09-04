"use client";

import { useId, useRef, useState } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const { hits, addNew } = comboSuggestions(options, value);
  const show = open && (hits.length > 0 || addNew);

  function focusInput() {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function startAdd() {
    setAdding(true);
    setOpen(true);
    focusInput();
  }

  function saveTyped() {
    const next = value.trim();
    if (next) {
      onChange(next);
      setAdding(false);
      setOpen(false);
      return;
    }
    startAdd();
  }

  return (
    <div className="ms-shop-combo">
      <input
        ref={inputRef}
        name={name}
        value={value}
        required={required}
        placeholder={adding ? "Type new value" : placeholder}
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
      <button
        type="button"
        className="ms-shop-combo-add"
        data-ms-add-new=""
        onMouseDown={(event) => event.preventDefault()}
        onClick={adding ? saveTyped : startAdd}
      >
        {adding && value.trim() ? (
          <>Save · {value.trim()}</>
        ) : (
          <>
            Add / New
            <small>जोड़ें</small>
          </>
        )}
      </button>
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
          {addNew ? (
            <li>
              <button
                type="button"
                onMouseDown={() => {
                  onChange(addNew);
                  setAdding(false);
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
