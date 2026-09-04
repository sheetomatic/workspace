"use client";

import { useState } from "react";
import { ShopCombo } from "@/components/saas/mobile-shop-combo";
import { MobileShopNav } from "@/components/saas/mobile-shop-nav";

const BRANDS = ["Samsung", "Redmi", "Vivo"];
const MODELS = ["A15", "Note 13", "Y16"];
const COLORS = ["Black", "Blue"];
const ACCESSORIES = ["Plain cover", "20W charger"];
const JOBS = ["Screen", "Battery", "Other"];

export function MobileShopComboPreview() {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [accessory, setAccessory] = useState("");
  const [job, setJob] = useState("Screen");

  return (
    <div className="saas-page ms-shop">
      <MobileShopNav />
      <section>
        <h1>Add / New</h1>
        <p className="ms-shop-lead">
          Layout proof at phone width. Every catalog pick has a visible Add / New
          button. Used is not on the bar.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
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
        <label>
          Accessory · एक्सेसरी
          <ShopCombo
            value={accessory}
            onChange={setAccessory}
            options={ACCESSORIES}
            placeholder="Cover / charger"
          />
        </label>
        <label>
          Job
          <ShopCombo
            value={job}
            onChange={setJob}
            options={JOBS}
            placeholder="Screen / battery"
          />
        </label>
        </form>
      </section>
    </div>
  );
}
