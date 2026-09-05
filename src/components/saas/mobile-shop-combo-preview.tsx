"use client";

import { useState } from "react";
import { ShopCombo } from "@/components/saas/mobile-shop-combo";
import { PhoneCascade } from "@/components/saas/mobile-shop-phone-cascade";
import { MobileShopNav } from "@/components/saas/mobile-shop-nav";
import type { PhoneCatalogEntry } from "@/lib/mobile-shop/phone-catalog";

const CATALOG: PhoneCatalogEntry[] = [
  { brand: "Samsung", model: "A15", color: "Black", condition: "NEW" },
  { brand: "Samsung", model: "A15", color: "Blue", condition: "NEW" },
  { brand: "Redmi", model: "Note 13", color: "Black", condition: "USED" },
];
const ACCESSORIES = ["Plain cover", "20W charger"];
const SUPPLIERS = ["Raj Mobile Dist.", "Walk-in"];

export function MobileShopComboPreview() {
  const [pick, setPick] = useState({ brand: "", model: "", color: "" });
  const [accessory, setAccessory] = useState("");
  const [supplier, setSupplier] = useState("");

  return (
    <div className="saas-page ms-shop">
      <MobileShopNav />
      <section data-preview="stock-in">
        <h1>Stock in</h1>
        <p className="ms-shop-lead">
          स्टॉक इन. Family → model → color. Add / New on every picker.
        </p>
        <form onSubmit={(event) => event.preventDefault()}>
          <label>
            Supplier · सप्लायर
            <ShopCombo
              value={supplier}
              onChange={setSupplier}
              options={SUPPLIERS}
              placeholder="Distributor / walk-in"
            />
          </label>
          <div className="ms-shop-line">
            <strong>Line 1</strong>
            <label>
              What
              <div className="ms-shop-type" role="group">
                <button type="button" className="is-active">
                  New phone
                  <small>नया फोन</small>
                </button>
                <button type="button">
                  Used phone
                  <small>पुराना फोन</small>
                </button>
              </div>
            </label>
            <PhoneCascade catalog={CATALOG} value={pick} onChange={setPick} />
          </div>
        </form>
      </section>
      <section data-preview="sale">
        <h1>Sale</h1>
        <p className="ms-shop-lead">सेल. Used is a type on Sale, not a nav tab.</p>
        <div className="ms-shop-type" role="group" aria-label="Sale type">
          <a className="is-active" href="#sale">
            New
            <small>नया</small>
          </a>
          <a href="#sale">
            Used
            <small>पुराना</small>
          </a>
        </div>
        <form onSubmit={(event) => event.preventDefault()}>
          <PhoneCascade catalog={CATALOG} value={pick} onChange={setPick} />
          <a className="ms-shop-combo-add" data-ms-add-new="" href="#stock-in">
            Add / New
            <small>नया · stock in</small>
          </a>
        </form>
      </section>
      <section data-preview="accessories">
        <h1>Accessories</h1>
        <p className="ms-shop-lead">एक्सेसरी. Name picker has Add / New.</p>
        <form onSubmit={(event) => event.preventDefault()}>
          <label>
            Name
            <ShopCombo
              value={accessory}
              onChange={setAccessory}
              options={ACCESSORIES}
              placeholder="Cover / charger"
            />
          </label>
        </form>
      </section>
    </div>
  );
}
