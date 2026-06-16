"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type SettingsTab = {
  key: string;
  label: string;
  scope?: string;
};

export function SettingsTabNav({
  tabs,
  activeTab,
}: {
  tabs: SettingsTab[];
  activeTab: string;
}) {
  const searchParams = useSearchParams();

  function hrefFor(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "account") {
      params.delete("tab");
    } else {
      params.set("tab", key);
    }
    const query = params.toString();
    return query ? `/app/settings?${query}` : "/app/settings";
  }

  return (
    <nav aria-label="Settings sections" className="saas-settings-tabs">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          aria-current={activeTab === tab.key ? "page" : undefined}
          className={`saas-settings-tab${activeTab === tab.key ? " is-active" : ""}`}
          href={hrefFor(tab.key)}
          title={tab.scope}
        >
          <span>{tab.label}</span>
          {tab.scope ? <span className="saas-settings-tab-scope">{tab.scope}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
