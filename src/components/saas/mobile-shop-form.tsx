"use client";

import { useState, useTransition } from "react";
import type { ShopActionResult } from "@/app/app/mobile-shop/actions";

export function ShopForm({
  action,
  children,
  className,
  submitLabel = "Save",
}: {
  action: (formData: FormData) => Promise<ShopActionResult>;
  children: React.ReactNode;
  className?: string;
  submitLabel?: string;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<ShopActionResult | null>(null);
  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        start(async () => {
          const result = await action(formData);
          setMessage(result);
          if (result.ok) event.currentTarget.reset();
        });
      }}
    >
      {children}
      <button className="btn-primary" disabled={pending} type="submit">
        {pending ? "Saving…" : submitLabel}
      </button>
      {message ? <p role="status">{message.message}</p> : null}
    </form>
  );
}
