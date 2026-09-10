"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LicensedKitStatus } from "@prisma/client";
import type { LicensedKitDefinition } from "@/lib/addons/licensed-kits";
import { formatInrPaise, rupeesToPaise } from "@/lib/billing/money";
import {
  requestKitLicenseAction,
  type KitActionResult,
} from "@/app/app/fms/kits/actions";

export type KitLicenseSnapshot = {
  kitKey: string;
  status: LicensedKitStatus;
  billingPeriod: "MONTHLY" | "ANNUAL";
  renewalAt: string | null;
};

const SHOP_TAPS = [
  "New sale",
  "Used sale",
  "Repair",
  "Accessories",
  "Stock in",
];

function statusLabel(status: LicensedKitStatus | null) {
  if (!status) return "Not licensed";
  if (status === "ACTIVE") return "Active";
  if (status === "REQUESTED") return "Invoice pending";
  if (status === "PAST_DUE") return "Past due";
  return "Cancelled";
}

function statusTone(status: LicensedKitStatus | null) {
  if (status === "ACTIVE") return "ok";
  if (status === "REQUESTED" || status === "PAST_DUE") return "warn";
  return "idle";
}

export function FmsLicensedKitsPanel({
  kits,
  licenses,
  canRequest,
}: {
  kits: LicensedKitDefinition[];
  licenses: KitLicenseSnapshot[];
  canRequest: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<KitActionResult | null>(null);
  const licenseByKey = new Map(licenses.map((row) => [row.kitKey, row]));

  const run = (kitKey: string) => {
    const formData = new FormData();
    formData.set("kitKey", kitKey);
    startTransition(async () => {
      const result = await requestKitLicenseAction(formData);
      setMessage(result);
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="ms-shop-license">
      {message ? (
        <p className="ms-shop-lead" role="status">
          {message.message}
        </p>
      ) : null}

      {kits.map((kit) => {
        const license = licenseByKey.get(kit.key) ?? null;
        const active = license?.status === "ACTIVE";
        const requested = license?.status === "REQUESTED";
        const tone = statusTone(license?.status ?? null);

        return (
          <article className="ms-shop-license-card" id={kit.key} key={kit.key}>
            <header className="ms-shop-license-head">
              <p className="ms-shop-license-eyebrow">Shop app</p>
              <h2>{kit.name}</h2>
              <p>Five taps on the counter. Stock and money, not a spreadsheet.</p>
            </header>

            <div className="ms-shop-license-meta">
              <p className="ms-shop-license-price">
                {formatInrPaise(rupeesToPaise(kit.priceMonthlyInr))}
                <small>/ month</small>
              </p>
              <span className={`ms-shop-chip ms-shop-chip--${tone}`}>
                {statusLabel(license?.status ?? null)}
              </span>
            </div>

            <ul className="ms-shop-license-taps">
              {SHOP_TAPS.map((tap) => (
                <li key={tap}>{tap}</li>
              ))}
            </ul>

            <div className="ms-shop-license-actions">
              {active ? (
                <Link className="ms-shop-btn" href={kit.appHref ?? "/app/mobile-shop"}>
                  Open counter
                  <small>Home</small>
                </Link>
              ) : canRequest ? (
                <button
                  className="ms-shop-btn"
                  disabled={pending || requested}
                  type="button"
                  onClick={() => run(kit.key)}
                >
                  {requested ? "Requested" : pending ? "Requesting…" : "Request license"}
                  <small>
                    {requested ? "Pay the next invoice" : "Adds ₹999 to the invoice"}
                  </small>
                </button>
              ) : (
                <p className="ms-shop-empty">Ask an admin to request this license.</p>
              )}
              <Link className="ms-shop-btn ms-shop-btn--ghost" href="/app/billing">
                Billing
                <small>Invoice and UPI</small>
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
