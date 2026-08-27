"use client";

import type { AppConfig } from "@/lib/app-builder";

export function IntelligencePanel({
  config,
  onChange,
}: {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
}) {
  const intel = config.intelligence || { voiceEnabled: false, aiFormulas: true };

  function patch(next: Partial<typeof intel>) {
    onChange({
      ...config,
      intelligence: { ...intel, ...next },
    });
  }

  return (
    <div className="plain">
      <h2>Intelligence & voice</h2>
      <p className="hint">
        Voice fills the open form from speech. AI formula on Data still suggests
        AppSheet expressions from a short prompt.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={!!intel.voiceEnabled}
          onChange={(e) => patch({ voiceEnabled: e.target.checked })}
        />
        Enable voice on forms
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={intel.aiFormulas !== false}
          onChange={(e) => patch({ aiFormulas: e.target.checked })}
        />
        AI formula helper on columns
      </label>
      <label className="field-label">
        Voice hint
        <input
          value={intel.voiceHint || ""}
          onChange={(e) => patch({ voiceHint: e.target.value })}
          placeholder="Say name, company, phone, stage"
        />
      </label>
      <p className="hint">
        Preview a form, tap the mic, and speak. Chrome / Edge listen in the
        browser. WhatsApp and email still go through Bots.
      </p>
    </div>
  );
}
