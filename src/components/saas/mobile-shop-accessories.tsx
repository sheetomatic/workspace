"use client";

import { useMemo, useState } from "react";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import { ShopCombo } from "@/components/saas/mobile-shop-combo";
import { sellAction, stockInAction } from "@/app/app/mobile-shop/actions";
import { comboSuggestions, searchNamedItems } from "@/lib/mobile-shop/addable";
import { effectiveMoq } from "@/lib/mobile-shop/moq";

export type AccessoryRow = {
  id: string;
  name: string;
  qty: number;
  moq: number;
};

function QtyStepper({
  name,
  value,
  onChange,
  min = 1,
}: {
  name: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  return (
    <div className="ms-shop-qty">
      <button
        type="button"
        aria-label="Minus"
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <input
        name={name}
        value={value}
        inputMode="numeric"
        onChange={(event) => {
          const next = Number.parseInt(event.target.value, 10);
          onChange(Number.isFinite(next) ? Math.max(min, next) : min);
        }}
      />
      <button type="button" aria-label="Plus" onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

export function AccessoriesFloor({ items }: { items: AccessoryRow[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(
    () => items.find((item) => item.qty > 0)?.id ?? "",
  );
  const [sellQty, setSellQty] = useState(1);
  const [addName, setAddName] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [addMoq, setAddMoq] = useState(2);

  const names = items.map((item) => item.name);
  const onHand = items.filter((item) => item.qty > 0);
  const filtered = searchNamedItems(onHand, query, 24);
  const selected = onHand.find((item) => item.id === selectedId);
  const { addNew } = comboSuggestions(names, query.trim() || addName);

  return (
    <>
      <label>
        Search · खोजें
        <div className="ms-shop-combo-row">
          <input
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              if (next.trim() && !items.some((item) => item.name.toLowerCase() === next.trim().toLowerCase())) {
                setAddName(next.trim());
              }
            }}
            placeholder="Cover / charger / earphone"
            autoComplete="off"
          />
          <button
            type="button"
            className="ms-shop-combo-add"
            data-ms-add-new=""
            aria-label="Add / New"
            onClick={() => {
              setAddName(query.trim());
              document.getElementById("ms-acc-stock-in")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Add / New
            <small>नया</small>
          </button>
        </div>
      </label>

      <div className="ms-shop-panel">
        <h2>Sell · बेचें</h2>
        {onHand.length === 0 ? (
          <p className="ms-shop-empty">No accessory qty — add stock below, then sell.</p>
        ) : filtered.length === 0 ? (
          <p className="ms-shop-empty">No match. Add new below if it is not listed.</p>
        ) : (
          <div className="ms-shop-cards">
            {filtered.map((item) => {
              const active = item.id === selectedId;
              const floor = effectiveMoq(item.moq, "ACCESSORY");
              return (
                <button
                  className={active ? "ms-shop-card is-selected" : "ms-shop-card"}
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="ms-shop-card-row">
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        Qty {item.qty} · MOQ {floor}
                      </span>
                    </div>
                    <span className={active ? "ms-shop-chip" : "ms-shop-chip ms-shop-chip--tap"}>
                      {active ? "Sell this" : "Tap"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <ShopForm
          action={sellAction}
          submitLabel="Sell accessory"
          onResult={(result) => {
            if (result.ok) setSellQty(1);
          }}
        >
          <input name="mode" type="hidden" value="ACCESSORY" />
          <input name="itemId" type="hidden" value={selected?.id ?? ""} />
          <label>
            Qty
            <QtyStepper name="qty" value={sellQty} onChange={setSellQty} />
          </label>
          <label>
            Amount (₹)
            <input name="amount" inputMode="decimal" placeholder="0" />
          </label>
        </ShopForm>
      </div>

      <div className="ms-shop-panel" id="ms-acc-stock-in">
        <h2>Stock in · स्टॉक इन</h2>
        {addNew ? (
          <p className="ms-shop-empty">
            “{addNew}” is not listed — add it here and keep going.
          </p>
        ) : null}
        <ShopForm
          action={stockInAction}
          submitLabel="Add stock"
          onResult={(result) => {
            if (result.ok) {
              setAddName("");
              setAddQty(1);
              setQuery("");
            }
          }}
        >
          <input name="kind" type="hidden" value="ACCESSORY" />
          <label>
            Name
            <ShopCombo
              name="name"
              value={addName}
              onChange={setAddName}
              options={names}
              placeholder="Plain cover / 20W charger"
              required
            />
          </label>
          <label>
            Qty
            <QtyStepper name="qty" value={addQty} onChange={setAddQty} />
          </label>
          <label>
            MOQ · न्यूनतम
            <input
              name="moq"
              type="number"
              min={0}
              inputMode="numeric"
              value={addMoq}
              onChange={(event) => setAddMoq(Number.parseInt(event.target.value, 10) || 0)}
            />
          </label>
        </ShopForm>
      </div>
    </>
  );
}
