"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LicensedKitStatus } from "@prisma/client";
import type { LicensedKitDefinition } from "@/lib/addons/licensed-kits";
import { formatInrPaise, rupeesToPaise } from "@/lib/billing/money";
import {
  installKitAction,
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
  installedPresetIds,
  canRequest,
  canInstall,
}: {
  kits: LicensedKitDefinition[];
  licenses: KitLicenseSnapshot[];
  installedPresetIds: string[];
  canRequest: boolean;
  canInstall: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<KitActionResult | null>(null);
  const licenseByKey = new Map(licenses.map((row) => [row.kitKey, row]));

  const run = (action: (formData: FormData) => Promise<KitActionResult>, kitKey: string) => {
    const formData = new FormData();
    formData.set("kitKey", kitKey);
    startTransition(async () => {
      const result = await action(formData);
      setMessage(result);
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="ws-fms-kits">
      {message ? (
        <p className={message.ok ? "saas-panel-lead" : "saas-panel-lead"} role="status">
          {message.message}
        </p>
      ) : null}

      <ul className="ws-fms-setup-list">
        {kits.map((kit) => {
          const license = licenseByKey.get(kit.key) ?? null;
          const installed = Boolean(kit.presetId && installedPresetIds.includes(kit.presetId));
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
                  {installed ? " · Installed" : ""}
                </p>
                <div className="ws-form-actions" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {canRequest && !active ? (
                    <button
                      className="btn-primary btn-sm"
                      disabled={pending || license?.status === "REQUESTED"}
                      type="button"
                      onClick={() => run(requestKitLicenseAction, kit.key)}
                    >
                      {license?.status === "REQUESTED" ? "Requested" : "Request license"}
                    </button>
                  ) : null}
                  {canInstall && active && !installed ? (
                    <button
                      className="btn-primary btn-sm"
                      disabled={pending}
                      type="button"
                      onClick={() => run(installKitAction, kit.key)}
                    >
                      Install FMS
                    </button>
                  ) : null}
                  {installed ? (
                    <Link className="btn-secondary btn-sm" href="/app/fms/setup">
                      Open Setup
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
