"use client";

import { useId, useState } from "react";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import { stockInInvoiceAction, stockOutAction } from "@/app/app/mobile-shop/actions";
import {
  STOCK_IN_REASONS,
  STOCK_OUT_FORM_REASONS,
} from "@/lib/mobile-shop/reasons";
import {
  searchPhoneCatalog,
  type PhoneCatalogEntry,
} from "@/lib/mobile-shop/phone-catalog";

type LineWhat = "PHONE_NEW" | "PHONE_USED" | "ACCESSORY" | "PART";

type DraftLine = {
  key: string;
  what: LineWhat;
  brand: string;
  model: string;
  color: string;
  imei: string;
  name: string;
  qty: string;
  query: string;
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
    query: "",
  };
}

function serializeLines(lines: DraftLine[]) {
  return lines.map((line) => {
    if (line.what === "ACCESSORY" || line.what === "PART") {
      return { kind: line.what, name: line.name, qty: Number(line.qty) || 0 };
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

function conditionLabel(condition: PhoneCatalogEntry["condition"]) {
  if (condition === "USED") return "Used";
  if (condition === "REFURBISHED") return "Refurbished";
  if (condition === "NEW") return "New";
  return "";
}

export function StockInForm({ catalog }: { catalog: PhoneCatalogEntry[] }) {
  const [lines, setLines] = useState<DraftLine[]>(() => [newLine()]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const listId = useId();

  function patch(key: string, next: Partial<DraftLine>) {
    setLines((rows) => rows.map((row) => (row.key === key ? { ...row, ...next } : row)));
  }

  function pickPhone(line: DraftLine, hit: PhoneCatalogEntry) {
    const used = hit.condition === "USED" || hit.condition === "REFURBISHED";
    patch(line.key, {
      brand: hit.brand,
      model: hit.model,
      color: hit.color,
      query: "",
      what: used ? "PHONE_USED" : line.what === "PHONE_USED" ? "PHONE_USED" : "PHONE_NEW",
    });
    setOpenKey(null);
  }

  return (
    <ShopForm
      action={stockInInvoiceAction}
      submitLabel="Stock in"
      onResult={(result) => {
        if (result.ok) setLines([newLine()]);
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
        <input name="supplier" placeholder="Distributor / walk-in" autoComplete="off" />
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
          const hits =
            phone && (openKey === line.key || line.query.trim())
              ? searchPhoneCatalog(catalog, line.query)
              : [];
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
                <select
                  value={line.what}
                  onChange={(event) =>
                    patch(line.key, { what: event.target.value as LineWhat, query: "" })
                  }
                >
                  <option value="PHONE_NEW">New phone · नया फोन</option>
                  <option value="PHONE_USED">Used phone · पुराना फोन</option>
                  <option value="ACCESSORY">Accessory · एक्सेसरी</option>
                  <option value="PART">Repair part · पार्ट</option>
                </select>
              </label>
              {phone ? (
                <>
                  <label>
                    Select phone · फोन चुनें
                    <input
                      value={line.query}
                      onFocus={() => setOpenKey(line.key)}
                      onChange={(event) => {
                        patch(line.key, { query: event.target.value });
                        setOpenKey(line.key);
                      }}
                      onBlur={() => {
                        window.setTimeout(() => setOpenKey((open) => (open === line.key ? null : open)), 120);
                      }}
                      placeholder="Make, model, color"
                      autoComplete="off"
                      aria-autocomplete="list"
                      aria-controls={`${listId}-${line.key}`}
                    />
                  </label>
                  {hits.length > 0 ? (
                    <ul className="ms-shop-suggest" id={`${listId}-${line.key}`} role="listbox">
                      {hits.map((hit) => (
                        <li key={`${hit.brand}-${hit.model}-${hit.color}`}>
                          <button type="button" onMouseDown={() => pickPhone(line, hit)}>
                            {[hit.brand, hit.model, hit.color].filter(Boolean).join(" ")}
                            {hit.condition ? ` · ${conditionLabel(hit.condition)}` : ""}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <label>
                    Brand · मेक
                    <input
                      value={line.brand}
                      onChange={(event) => patch(line.key, { brand: event.target.value })}
                      placeholder="Samsung / Redmi"
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    Model
                    <input
                      value={line.model}
                      onChange={(event) => patch(line.key, { model: event.target.value })}
                      placeholder="A15"
                      autoComplete="off"
                    />
                  </label>
                  <label>
                    Color · रंग
                    <input
                      value={line.color}
                      onChange={(event) => patch(line.key, { color: event.target.value })}
                      placeholder="Black"
                      autoComplete="off"
                    />
                  </label>
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
                    <input
                      value={line.name}
                      onChange={(event) => patch(line.key, { name: event.target.value })}
                      placeholder={line.what === "PART" ? "A15 screen" : "Cover / charger"}
                      autoComplete="off"
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
