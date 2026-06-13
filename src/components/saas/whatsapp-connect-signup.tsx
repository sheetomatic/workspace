"use client";

import { ExternalLink, KeyRound, Smartphone } from "lucide-react";
import {
  redlavaPortalApiKeysUrl,
  redlavaPortalBrandName,
  redlavaPortalConnectedAccountsUrl,
  redlavaSignupUrl,
} from "@/lib/integrations/redlava-portal";

export function WhatsAppConnectSignupCard({
  credentialsReady,
}: {
  credentialsReady: boolean;
}) {
  if (credentialsReady) {
    return null;
  }

  const brandName = redlavaPortalBrandName();
  const signupUrl = redlavaSignupUrl();

  return (
    <div className="ws-wa-connect-signup-banner">
      <div className="ws-wa-connect-signup-copy">
        <Smartphone size={18} aria-hidden className="ws-wa-connect-signup-icon" />
        <div>
          <strong>Connect your WhatsApp number</strong>
          <p>
            Sign up on {brandName}, then paste your API key and Phone ID below.
          </p>
        </div>
      </div>
      <div className="ws-wa-connect-signup-actions">
        <a
          className="btn-cta btn-primary btn-compact"
          href={signupUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Connect on {brandName}
        </a>
        <a
          className="ws-product-module-cta inline"
          href={redlavaPortalApiKeysUrl()}
          rel="noopener noreferrer"
          target="_blank"
        >
          <KeyRound size={14} aria-hidden />
          API keys
        </a>
        <a
          className="ws-product-module-cta inline"
          href={redlavaPortalConnectedAccountsUrl()}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLink size={14} aria-hidden />
          Accounts
        </a>
      </div>
    </div>
  );
}
