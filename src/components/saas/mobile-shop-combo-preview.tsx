"use client";

import { useState } from "react";
import { ShopCombo } from "@/components/saas/mobile-shop-combo";
import { MobileShopNav } from "@/components/saas/mobile-shop-nav";

const BRANDS = ["Samsung", "Redmi", "Vivo"];
const MODELS = ["A15", "Note 13", "Y16"];
const COLORS = ["Black", "Blue"];
const ACCESSORIES = ["Plain cover", "20W charger"];

export function MobileShopComboPreview() {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [accessory, setAccessory] = useState("");
  const [query, setQuery] = useState("");

  return (
    <div className="saas-page ms-shop">
      <MobileShopNav />
      <section data-preview="stock-in">
        <h1>Stock in</h1>
        <p className="ms-shop-lead">स्टॉक इन. Make, model, color each have Add / New.</p>
        <form onSubmit={(event) => event.preventDefault()}>
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
            <label>
              Brand · मेक
              <ShopCombo
                value={brand}
                onChange={setBrand}
                options={BRANDS}
                placeholder="Samsung / Redmi"
              />
            </label>
            <label>
              Model
              <ShopCombo
                value={model}
                onChange={setModel}
                options={MODELS}
                placeholder="A15"
              />
            </label>
            <label>
              Color · रंग
              <ShopCombo
                value={color}
                onChange={setColor}
                options={COLORS}
                placeholder="Black"
              />
            </label>
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
          <label>
            Search phone · फोन खोजें
            <div className="ms-shop-combo-row">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Make, model, color"
                autoComplete="off"
              />
              <a className="ms-shop-combo-add" data-ms-add-new="" href="#stock-in">
                Add / New
                <small>नया · stock in</small>
              </a>
            </div>
          </label>
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
