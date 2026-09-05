"use client";

import { useMemo, useState } from "react";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import { PhoneCascade } from "@/components/saas/mobile-shop-phone-cascade";
import { sellAction } from "@/app/app/mobile-shop/actions";
import {
  pickImeiFromStock,
  unsoldAsCatalog,
  unsoldMatching,
  type PhonePick,
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
  const catalog = useMemo(() => unsoldAsCatalog(phones), [phones]);
  const [pick, setPick] = useState<PhonePick>({
    brand: preset?.brand ?? "",
    model: preset?.model ?? "",
    color: preset?.color ?? "",
  });
  const [imei, setImei] = useState(preset?.imei ?? "");

  const complete = Boolean(pick.brand.trim() && pick.model.trim() && pick.color.trim());
  const matches = complete ? unsoldMatching(phones, pick) : [];
  const selected = phones.find((phone) => phone.imei === imei && phone.qty > 0);

  function applyPick(next: PhonePick) {
    setPick(next);
    if (next.brand.trim() && next.model.trim() && next.color.trim()) {
      setImei(pickImeiFromStock(phones, next) ?? "");
    } else {
      setImei("");
    }
  }

  return (
    <ShopForm
      action={sellAction}
      submitLabel={used ? "Sell used phone" : "Sell new phone"}
      onResult={(result) => {
        if (result.ok) {
          setImei("");
          setPick({ brand: "", model: "", color: "" });
        }
      }}
    >
      <input name="mode" type="hidden" value="PHONE" />
      <input name="saleType" type="hidden" value={used ? "USED" : "NEW"} />

      <PhoneCascade catalog={catalog} value={pick} onChange={applyPick} />

      {phones.length === 0 ? (
        <p className="ms-shop-empty">
          No {used ? "used" : "new"} phones in stock — tap Stock in.
          <a className="ms-shop-combo-add" data-ms-add-new="" href="/app/mobile-shop/stock-in">
            Add / New
            <small>नया · stock in</small>
          </a>
        </p>
      ) : matches.length > 1 ? (
        <div className="ms-shop-cards">
          {matches.map((phone) => {
            const active = phone.imei === imei;
            return (
              <button
                className={active ? "ms-shop-card is-selected" : "ms-shop-card"}
                key={phone.id}
                type="button"
                onClick={() => setImei(phone.imei ?? "")}
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
      ) : null}

      {selected ? (
        <label>
          IMEI from stock
          <input name="imei" value={selected.imei ?? ""} readOnly required />
        </label>
      ) : (
        <>
          <input name="imei" value="" required readOnly placeholder="Pick a phone above" />
          <p className="ms-shop-empty">
            Pick family → model → color. IMEI fills from unsold stock.
          </p>
          <a className="ms-shop-combo-add" data-ms-add-new="" href="/app/mobile-shop/stock-in">
            Add / New
            <small>नया · stock in</small>
          </a>
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
