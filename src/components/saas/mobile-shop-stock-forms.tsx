"use client";

import { useState } from "react";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import { stockInAction, stockOutAction } from "@/app/app/mobile-shop/actions";
import {
  STOCK_IN_REASONS,
  STOCK_OUT_FORM_REASONS,
} from "@/lib/mobile-shop/reasons";

export function StockInForm() {
  const [what, setWhat] = useState("PHONE_NEW");
  const phone = what === "PHONE_NEW" || what === "PHONE_USED";
  return (
    <ShopForm action={stockInAction} submitLabel="Stock in">
      <label>
        Why
        <select name="reason" defaultValue="PURCHASE">
          {STOCK_IN_REASONS.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label} · {reason.hi}
            </option>
          ))}
        </select>
      </label>
      <label>
        What
        <select
          value={what}
          onChange={(event) => setWhat(event.target.value)}
        >
          <option value="PHONE_NEW">New phone · नया फोन</option>
          <option value="PHONE_USED">Used phone · पुराना फोन</option>
          <option value="ACCESSORY">Accessory · एक्सेसरी</option>
          <option value="PART">Repair part · पार्ट</option>
        </select>
      </label>
      <input name="kind" type="hidden" value={phone ? "PHONE" : what} />
      {phone ? (
        <>
          <input
            name="condition"
            type="hidden"
            value={what === "PHONE_USED" ? "USED" : "NEW"}
          />
          <label>
            Brand
            <input name="brand" required placeholder="Samsung / Redmi" autoComplete="off" />
          </label>
          <label>
            Model
            <input name="model" required placeholder="A15" autoComplete="off" />
          </label>
          <label>
            IMEI / serial
            <input name="imei" required inputMode="numeric" autoComplete="off" />
          </label>
        </>
      ) : (
        <>
          <label>
            Name
            <input
              name="name"
              required
              placeholder={what === "PART" ? "A15 screen" : "Cover / charger"}
              autoComplete="off"
            />
          </label>
          <label>
            Qty
            <input name="qty" type="number" min={1} defaultValue={1} inputMode="numeric" />
          </label>
        </>
      )}
    </ShopForm>
  );
}

export function StockOutForm({
  items,
}: {
  items: Array<{ id: string; kind: string; name: string; imei: string | null; qty: number }>;
}) {
  return (
    <ShopForm action={stockOutAction} submitLabel="Stock out">
      <label>
        Why
        <select name="reason" defaultValue="RETURN_TO_SUPPLIER">
          {STOCK_OUT_FORM_REASONS.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label} · {reason.hi}
            </option>
          ))}
        </select>
      </label>
      <label>
        Item
        <select name="itemId" required>
          {items.length === 0 ? (
            <option value="" disabled>
              Nothing in stock
            </option>
          ) : (
            items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.kind} · {item.name}
                {item.imei ? ` · ${item.imei}` : ""} · qty {item.qty}
              </option>
            ))
          )}
        </select>
      </label>
      <label>
        Qty
        <input name="qty" type="number" min={1} defaultValue={1} inputMode="numeric" />
      </label>
    </ShopForm>
  );
}
