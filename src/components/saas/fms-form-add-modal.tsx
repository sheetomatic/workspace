"use client";

import { useEffect, useRef } from "react";
import type { FmsFormFieldType } from "@prisma/client";
import { FMS_FIELD_TYPE_LABELS } from "@/lib/fms/constants";

const FIELD_PICKER: FmsFormFieldType[] = [
  "TEXT",
  "TEXTAREA",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "ENUM",
  "ENUM_LIST",
  "DATE",
  "DATETIME",
  "FILE",
];

type Props = {
  open: boolean;
  onClose: () => void;
  onAddField: (type: FmsFormFieldType) => void;
};

export function FmsFieldTypePopover({ open, onClose, onAddField }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) {
        return;
      }
      if ((target as Element).closest?.("[data-fms-add-trigger]")) {
        return;
      }
      onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("click", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("click", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function handlePick(type: FmsFormFieldType) {
    onAddField(type);
    onClose();
  }

  return (
    <div ref={menuRef} className="ws-fms-jf-popover" role="menu">
      {FIELD_PICKER.map((type) => (
        <button
          key={type}
          type="button"
          role="menuitem"
          className="ws-fms-jf-popover-item"
          onClick={() => handlePick(type)}
        >
          {FMS_FIELD_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
