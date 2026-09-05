"use client";

import { useState } from "react";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import { stockInAction, stockInInvoiceAction, stockOutAction } from "@/app/app/mobile-shop/actions";
import {
  STOCK_IN_REASONS,
  STOCK_OUT_FORM_REASONS,
} from "@/lib/mobile-shop/reasons";
import { type PhoneCatalogEntry } from "@/lib/mobile-shop/phone-catalog";
import { ShopCombo } from "@/components/saas/mobile-shop-combo";
import { PhoneCascade } from "@/components/saas/mobile-shop-phone-cascade";

type LineWhat = "PHONE_NEW" | "PHONE_USED" | "ACCESSORY" | "PART";

const LINE_WHATS: Array<{ value: LineWhat; label: string; hi: string }> = [
  { value: "PHONE_NEW", label: "New phone", hi: "नया फोन" },
  { value: "PHONE_USED", label: "Used phone", hi: "पुराना फोन" },
  { value: "ACCESSORY", label: "Accessory", hi: "एक्सेसरी" },
  { value: "PART", label: "Repair part", hi: "पार्ट" },
];

type DraftLine = {
  key: string;
  what: LineWhat;
  brand: string;
  model: string;
  color: string;
  imei: string;
  name: string;
  qty: string;
  moq: string;
};

function newLine(what: LineWhat = "PHONE_NEW"): DraftLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    what,
    brand: "",
    model: "",
    color: "",
    imei: "",
    name: "",
    qty: "1",
    moq: "2",
  };
}

function serializeLines(lines: DraftLine[]) {
  return lines.map((line) => {
    if (line.what === "ACCESSORY" || line.what === "PART") {
      const moq = Number(line.moq);
      return {
        kind: line.what,
        name: line.name,
        qty: Number(line.qty) || 0,
        ...(Number.isFinite(moq) && moq > 0 ? { moq } : {}),
      };
    }
    return {
      kind: "PHONE",
      brand: line.brand,
      model: line.model,
      color: line.color,
      imei: line.imei,
      condition: line.what === "PHONE_USED" ? "USED" : "NEW",
    };
  });
}

export function StockInForm({
  catalog,
  accessoryNames = [],
  partNames = [],
  suppliers = [],
}: {
  catalog: PhoneCatalogEntry[];
  accessoryNames?: string[];
  partNames?: string[];
  suppliers?: string[];
}) {
  const [lines, setLines] = useState<DraftLine[]>(() => [newLine()]);
  const [supplier, setSupplier] = useState("");

  function patch(key: string, next: Partial<DraftLine>) {
    setLines((rows) => rows.map((row) => (row.key === key ? { ...row, ...next } : row)));
  }

  return (
    <ShopForm
      action={stockInInvoiceAction}
      submitLabel="Stock in"
      onResult={(result) => {
        if (result.ok) {
          setLines([newLine()]);
          setSupplier("");
        }
      }}
    >
      <label>
        Invoice no. · बिल नंबर
        <input name="invoiceNo" required placeholder="GST / bill no." autoComplete="off" />
      </label>
      <label>
        Invoice date
        <input name="invoiceDate" type="date" />
      </label>
      <label>
        Supplier · सप्लायर
        <ShopCombo
          name="supplier"
          value={supplier}
          onChange={setSupplier}
          options={suppliers}
          placeholder="Distributor / walk-in"
        />
      </label>
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

      <input type="hidden" name="lines" value={JSON.stringify(serializeLines(lines))} />

      <div className="ms-shop-lines">
        {lines.map((line, index) => {
          const phone = line.what === "PHONE_NEW" || line.what === "PHONE_USED";
          return (
            <div className="ms-shop-line" key={line.key}>
              <div className="ms-shop-card-row">
                <strong>Line {index + 1}</strong>
                {lines.length > 1 ? (
                  <button
                    className="ms-shop-line-remove"
                    type="button"
                    onClick={() => setLines((rows) => rows.filter((row) => row.key !== line.key))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <label>
                What
                <div className="ms-shop-type" role="group">
                  {LINE_WHATS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={line.what === option.value ? "is-active" : undefined}
                      onClick={() => patch(line.key, { what: option.value })}
                    >
                      {option.label}
                      <small>{option.hi}</small>
                    </button>
                  ))}
                </div>
              </label>
              {phone ? (
                <>
                  <PhoneCascade
                    catalog={catalog}
                    value={{ brand: line.brand, model: line.model, color: line.color }}
                    onChange={(next) => patch(line.key, next)}
                  />
                  <label>
                    IMEI / serial
                    <input
                      value={line.imei}
                      onChange={(event) => patch(line.key, { imei: event.target.value })}
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Name
                    <ShopCombo
                      value={line.name}
                      onChange={(name) => patch(line.key, { name })}
                      options={line.what === "PART" ? partNames : accessoryNames}
                      placeholder={line.what === "PART" ? "A15 screen" : "Cover / charger"}
                    />
                  </label>
                  <label>
                    Qty
                    <input
                      value={line.qty}
                      onChange={(event) => patch(line.key, { qty: event.target.value })}
                      type="number"
                      min={1}
                      inputMode="numeric"
                    />
                  </label>
                  <label>
                    MOQ · न्यूनतम
                    <input
                      value={line.moq}
                      onChange={(event) => patch(line.key, { moq: event.target.value })}
                      type="number"
                      min={0}
                      inputMode="numeric"
                    />
                  </label>
                </>
              )}
            </div>
          );
        })}
      </div>
      <button className="ms-shop-add-line" type="button" onClick={() => setLines((rows) => [...rows, newLine()])}>
        Add line · लाइन जोड़ें
      </button>
    </ShopForm>
  );
}

export function UsedPhoneForm({ catalog }: { catalog: PhoneCatalogEntry[] }) {
  const [pick, setPick] = useState({ brand: "", model: "", color: "" });
  return (
    <ShopForm
      action={stockInAction}
      submitLabel="Add used phone"
      onResult={(result) => {
        if (result.ok) setPick({ brand: "", model: "", color: "" });
      }}
    >
      <input name="kind" type="hidden" value="PHONE" />
      <input name="condition" type="hidden" value="USED" />
      <input name="reason" type="hidden" value="PURCHASE" />
      <PhoneCascade
        catalog={catalog}
        value={pick}
        onChange={setPick}
        brandName="brand"
        modelName="model"
        colorName="color"
        required
      />
      <label>
        IMEI / serial
        <input name="imei" required inputMode="numeric" autoComplete="off" placeholder="15 digits" />
      </label>
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
