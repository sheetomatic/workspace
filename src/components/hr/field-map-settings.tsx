"use client";

import { useActionState } from "react";
import { saveFieldMapsApiKeyAction } from "@/lib/hr/hr-actions";
import type { HrActionResult } from "@/lib/hr/hr-result";

const initialState: HrActionResult = { ok: false, code: "", message: "" };

const guideSteps = [
  {
    number: "01",
    title: "Choose a Google Cloud project",
    path: "Google Cloud Console  ›  Project selector",
    highlight: "Create a project for your organization, or select an existing one.",
  },
  {
    number: "02",
    title: "Enable Maps Embed API",
    path: "APIs & Services  ›  Library",
    highlight: "Search for “Maps Embed API” and select Enable.",
  },
  {
    number: "03",
    title: "Create a restricted API key",
    path: "Google Maps Platform  ›  Credentials  ›  Create credentials",
    highlight: "Create an API key. Set Application restrictions to Websites and allow https://sheetomatic.com/* and https://app.sheetomatic.com/*. Set API restrictions to Maps Embed API only.",
  },
  {
    number: "04",
    title: "Save the key here",
    path: "Sheetomatic  ›  Field Executive Management  ›  Map settings",
    highlight: "Paste the key below and save. The visited-tour maps will appear in this module.",
  },
];

export function FieldMapSettings({
  canEdit,
  configured,
}: {
  canEdit: boolean;
  configured: boolean;
}) {
  const [saveState, saveAction, savePending] = useActionState(
    saveFieldMapsApiKeyAction,
    initialState,
  );
  const state = saveState;

  return (
    <details className="ws-hr-panel field-map-settings">
      <summary>
        <span>
          <strong>Google Maps setup</strong>
          <small>{configured ? "Map key connected" : "Connect your own Maps API key"}</small>
        </span>
        <span className={configured ? "field-map-status connected" : "field-map-status"}>
          {configured ? "Connected" : "Not connected"}
        </span>
      </summary>
      <div className="field-map-settings-body">
        <p className="ws-hr-help">
          Connect your organization’s Google Maps Embed API key to show an interactive map of each executive’s ordered visit stamps. The key belongs to this workspace.
        </p>
        <div className="field-map-key-note">
          This is a browser key and is visible to browsers that display your map. Restrict it in Google Cloud to your Sheetomatic domain and the Maps Embed API only. Never enter a service account key or another server secret here.
        </div>

        {canEdit ? (
          <div className="field-map-key-form-row">
            <form action={saveAction} className="field-map-key-form">
              <label>
                Google Maps Embed API key
                <input
                  autoComplete="off"
                  maxLength={256}
                  minLength={20}
                  name="googleMapsEmbedApiKey"
                  placeholder={configured ? "Paste a replacement key to rotate it" : "Paste your restricted browser key"}
                  required
                  type="password"
                />
              </label>
              <button className="btn-primary" disabled={savePending} name="intent" value="save" type="submit">
                {savePending ? "Saving…" : configured ? "Save replacement key" : "Save map key"}
              </button>
              {configured ? (
                <button className="btn-secondary" disabled={savePending} formNoValidate name="intent" value="clear" type="submit">
                  {savePending ? "Removing…" : "Remove key"}
                </button>
              ) : null}
            </form>
          </div>
        ) : (
          <p className="ws-hr-note">Ask a workspace Admin or Owner to connect the Maps key.</p>
        )}
        {state.message ? (
          <p className={state.ok ? "saas-form-message success" : "saas-form-message error"} role="status">
            {state.message}
          </p>
        ) : null}

        <h3>Setup guide</h3>
        <p className="field-map-guide-caption">
          Screen-by-screen illustrated guide (the panels are visual mock screenshots, not captured Google Cloud screens). Google Cloud may update button names and layout.
        </p>
        <ol className="field-map-guide-grid">
          {guideSteps.map((step) => (
            <li key={step.number}>
              <div className="field-map-guide-screen" aria-label={`Illustrative screen ${step.number}`}>
                <div className="field-map-guide-chrome"><i /><i /><i /><span>Google Cloud Console</span></div>
                <div className="field-map-guide-content">
                  <small>{step.path}</small>
                  <strong>{step.title}</strong>
                  <p>{step.highlight}</p>
                  <span className="field-map-guide-highlight">{step.number === "03" ? "sheetomatic.com/*  ·  app.sheetomatic.com/*  ·  Embed API" : step.number === "02" ? "Maps Embed API  ·  Enable" : step.number === "01" ? "Select or create project" : "Save map key"}</span>
                </div>
              </div>
              <h4><span>{step.number}</span>{step.title}</h4>
              <p>{step.highlight}</p>
            </li>
          ))}
        </ol>
        <p className="field-map-guide-links">
          Official Google guides: <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener noreferrer">Cloud credentials</a> · <a href="https://developers.google.com/maps/documentation/embed/get-started" target="_blank" rel="noopener noreferrer">Maps Embed API setup</a> · <a href="https://developers.google.com/maps/api-security-best-practices" target="_blank" rel="noopener noreferrer">API key restrictions</a>
        </p>
      </div>
    </details>
  );
}
