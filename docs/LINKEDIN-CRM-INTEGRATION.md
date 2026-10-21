# LinkedIn CRM integration

Sheetomatic uses LinkedIn's official OAuth and partner APIs only.

## Current foundation

- Admin-only LinkedIn OAuth from CRM Settings → Lead sources.
- Signed, ten-minute OAuth state bound to the current organization and user.
- AES-256-GCM encrypted access-token storage.
- OpenID profile association for the connected LinkedIn account.
- LinkedIn as a first-class CRM lead source.

## Required environment variables

```text
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_STATE_SECRET=
LINKEDIN_REDIRECT_URI=https://workspace.sheetomatic.com/api/integrations/linkedin/callback
LINKEDIN_OAUTH_SCOPES=openid profile email
LINKEDIN_PARTNER_SYNC_ENABLED=false
```

Register this exact callback URL in the LinkedIn developer app:

```text
https://workspace.sheetomatic.com/api/integrations/linkedin/callback
```

## Partner approval required

The standard OpenID scopes identify the connected account. They do not allow Sheetomatic to read all connections, invitation acceptance status, Sales Navigator data, or messages.

Automatic “connection accepted → CRM lead” sync must remain disabled until LinkedIn grants the relevant partner product and scopes. After approval, add the approved Invitations or CRM Sync polling endpoint using the encrypted account token and ingest each accepted member with a stable LinkedIn member ID. Conversation history must only be added if LinkedIn explicitly grants a messaging product that permits it.
