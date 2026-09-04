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

function statusLabel(status: LicensedKitStatus | null) {
  if (!status) return "Not licensed";
  if (status === "ACTIVE") return "Active license";
  if (status === "REQUESTED") return "Requested — pay invoice";
  if (status === "PAST_DUE") return "Past due";
  return "Cancelled";
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
    <div className="ws-fms-kits">
      {message ? (
        <p className="saas-panel-lead" role="status">
          {message.message}
        </p>
      ) : null}

      <ul className="ws-fms-setup-list">
        {kits.map((kit) => {
          const license = licenseByKey.get(kit.key) ?? null;
          const active = license?.status === "ACTIVE";
          return (
            <li className="ws-fms-setup-item" key={kit.key}>
              <article className="saas-panel" id={kit.key}>
                <h3>{kit.name}</h3>
                <p className="saas-panel-lead">
                  {kit.icp}. {kit.description}
                </p>
                <p>
                  {formatInrPaise(rupeesToPaise(kit.priceMonthlyInr))} / month per org
                  {" · "}
                  {statusLabel(license?.status ?? null)}
                </p>
                <div className="ws-form-actions" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {canRequest && !active ? (
                    <button
                      className="btn-primary btn-sm"
                      disabled={pending || license?.status === "REQUESTED"}
                      type="button"
                      onClick={() => run(kit.key)}
                    >
                      {license?.status === "REQUESTED" ? "Requested" : "Request license"}
                    </button>
                  ) : null}
                  {active ? (
                    <Link className="btn-primary btn-sm" href={kit.appHref ?? "/app/mobile-shop"}>
                      Open shop
                    </Link>
                  ) : null}
                  <Link className="btn-secondary btn-sm" href="/app/billing">
                    Billing
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
