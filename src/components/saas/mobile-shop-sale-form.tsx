"use client";

import { useMemo, useState } from "react";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import { sellAction } from "@/app/app/mobile-shop/actions";
import {
  searchUnsoldPhones,
  type UnsoldPhone,
} from "@/lib/mobile-shop/phone-catalog";

export function SalePhoneForm({
  phones,
  used,
  presetImei,
}: {
  phones: UnsoldPhone[];
  used: boolean;
  presetImei?: string;
}) {
  const preset = phones.find((phone) => phone.imei === presetImei && phone.qty > 0);
  const [query, setQuery] = useState("");
  const [imei, setImei] = useState(preset?.imei ?? "");
  const hits = useMemo(
    () => searchUnsoldPhones(phones, query, 12),
    [phones, query],
  );
  const selected = phones.find((phone) => phone.imei === imei && phone.qty > 0);

  return (
    <ShopForm
      action={sellAction}
      submitLabel={used ? "Sell used phone" : "Sell new phone"}
      onResult={(result) => {
        if (result.ok) {
          setImei("");
          setQuery("");
        }
      }}
    >
      <input name="mode" type="hidden" value="PHONE" />
      <input name="saleType" type="hidden" value={used ? "USED" : "NEW"} />

      <label>
        Search phone · फोन खोजें
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Make, model, color"
          autoComplete="off"
        />
      </label>
      <a className="ms-shop-combo-add" data-ms-add-new="" href="/app/mobile-shop/stock-in">
        Add / New
        <small>जोड़ें · stock in</small>
      </a>

      {phones.length === 0 ? (
        <p className="ms-shop-empty">
          No {used ? "used" : "new"} phones in stock — tap Stock in.
        </p>
      ) : hits.length === 0 ? (
        <p className="ms-shop-empty">No match. Type to search, or add stock.</p>
      ) : (
        <div className="ms-shop-cards">
          {hits.map((phone) => {
            const active = phone.imei === imei;
            return (
              <button
                className={active ? "ms-shop-card is-selected" : "ms-shop-card"}
                key={phone.id}
                type="button"
                onClick={() => {
                  setImei(phone.imei ?? "");
                  setQuery("");
                }}
              >
                <div className="ms-shop-card-row">
                  <div>
                    <strong>{phone.name}</strong>
                    <span>IMEI {phone.imei}</span>
                  </div>
                  <span className={active ? "ms-shop-chip" : "ms-shop-chip ms-shop-chip--tap"}>
                    {active ? "Selected" : "Pick"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected ? (
        <label>
          IMEI from stock
          <input name="imei" value={selected.imei ?? ""} readOnly required />
        </label>
      ) : (
        <>
          <input name="imei" value="" required readOnly placeholder="Pick a phone above" />
          <p className="ms-shop-empty">Pick a phone — IMEI fills from unsold stock.</p>
        </>
      )}

      <label>
        Customer
        <input name="customerName" required autoComplete="name" placeholder="Name" />
      </label>
      <label>
        WhatsApp / phone
        <input
          name="customerPhone"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="98xxxxxxxx"
        />
      </label>
      <label>
        Amount (₹)
        <input name="amount" required inputMode="decimal" placeholder="0" />
      </label>
    </ShopForm>
  );
}
