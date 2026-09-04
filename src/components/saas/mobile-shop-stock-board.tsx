"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ShopForm } from "@/components/saas/mobile-shop-form";
import { setMoqAction } from "@/app/app/mobile-shop/actions";
import { searchNamedItems } from "@/lib/mobile-shop/addable";
import { searchUnsoldPhones, type UnsoldPhone } from "@/lib/mobile-shop/phone-catalog";
import { effectiveMoq } from "@/lib/mobile-shop/moq";

type QtyCard = {
  id: string;
  name: string;
  kind: string;
  qty: number;
  moq: number;
};

export function StockBoard({
  phones,
  accessories,
  belowMoq,
}: {
  phones: UnsoldPhone[];
  accessories: QtyCard[];
  belowMoq: QtyCard[];
}) {
  const [query, setQuery] = useState("");
  const phoneHits = useMemo(
    () => searchUnsoldPhones(phones, query, 40),
    [phones, query],
  );
  const accessoryHits = useMemo(
    () => searchNamedItems(accessories, query, 40),
    [accessories, query],
  );
  const belowHits = useMemo(
    () => searchNamedItems(belowMoq, query, 24),
    [belowMoq, query],
  );

  return (
    <>
      <label>
        Search · खोजें
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Make, model, IMEI, accessory"
          autoComplete="off"
        />
      </label>

      <h2>Below MOQ · कम स्टॉक</h2>
      {belowHits.length === 0 ? (
        <p className="ms-shop-empty">Nothing below reorder level.</p>
      ) : (
        <div className="ms-shop-cards">
          {belowHits.map((item) => {
            const floor = effectiveMoq(item.moq, item.kind);
            return (
              <div className="ms-shop-card" key={item.id}>
                <div className="ms-shop-card-row">
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      Qty {item.qty} · MOQ {floor}
                    </span>
                  </div>
                  <span className="ms-shop-chip ms-shop-chip--warn">Reorder</span>
                </div>
                <ShopForm action={setMoqAction} submitLabel="Save MOQ">
                  <input name="itemId" type="hidden" value={item.id} />
                  <label>
                    MOQ
                    <input
                      name="moq"
                      type="number"
                      min={0}
                      defaultValue={floor}
                      inputMode="numeric"
                    />
                  </label>
                </ShopForm>
              </div>
            );
          })}
        </div>
      )}

      <h2>Phones · फोन</h2>
      {phoneHits.length === 0 ? (
        <p className="ms-shop-empty">
          No phones in stock — tap{" "}
          <Link href="/app/mobile-shop/stock-in">Stock in</Link>.
        </p>
      ) : (
        <div className="ms-shop-cards">
          {phoneHits.map((item) => {
            const used = item.condition !== "NEW";
            const href = used
              ? `/app/mobile-shop/sales?type=used&imei=${encodeURIComponent(item.imei ?? "")}`
              : `/app/mobile-shop/sales?imei=${encodeURIComponent(item.imei ?? "")}`;
            return (
              <Link className="ms-shop-card" href={href} key={item.id}>
                <div className="ms-shop-card-row">
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      IMEI {item.imei ?? "—"} · {used ? "Used" : "New"}
                    </span>
                  </div>
                  <span className="ms-shop-chip">Sell</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <h2>Accessories · एक्सेसरी</h2>
      {accessoryHits.length === 0 ? (
        <p className="ms-shop-empty">
          No accessory qty — tap{" "}
          <Link href="/app/mobile-shop/accessories">Accessories</Link>.
        </p>
      ) : (
        <div className="ms-shop-cards">
          {accessoryHits.map((item) => {
            const floor = effectiveMoq(item.moq, item.kind);
            const low = item.qty <= floor;
            return (
              <Link className="ms-shop-card" href="/app/mobile-shop/accessories" key={item.id}>
                <div className="ms-shop-card-row">
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      Qty {item.qty} · MOQ {floor}
                    </span>
                  </div>
                  <span className={low ? "ms-shop-chip ms-shop-chip--warn" : "ms-shop-chip"}>
                    {low ? "Below MOQ" : "Sell"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
