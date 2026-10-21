# LinkedIn accepted connections → Sheetomatic Leads

## Agreed requirement

Clients send connection requests on LinkedIn. After acceptance is confirmed,
Sheetomatic automatically creates or updates the corresponding lead in that
client's workspace.

The user requires automatic sync and selected **official LinkedIn access only**.
CSV uploads and independent session-based providers are outside this implementation.

Implementation is prepared. Activation requires LinkedIn's approval, appropriate
credentials, and member authorisation. No production data or credentials have
been changed as part of preparation.

## What is implemented

- `/app/leads/linkedin`: each workspace member with CRM Leads access can connect
  and disconnect their own LinkedIn accounts and view sync status.
- Standard OAuth authorization-code flow on LinkedIn's domain, with short-lived
  single-use state, browser binding, and current session/membership checks.
- A successful identity login is insufficient: the callback also verifies
  access to the actual accepted-outbound-invitations query.
- Access tokens are encrypted with AES-256-GCM, bound to the workspace/account,
  and never returned in page props, action responses, URLs, or logs.
- `/api/cron/linkedin-sync`: authenticated scheduled worker, hourly at minute 17.
- A first scan establishes a historical baseline without creating old leads.
  Monitoring begins after it completes.
- Subsequent sweeps process only `q=inviter&states=ACCEPTED`. Incoming requests,
  pending invitations, missing pending requests, or messages are not triggers.
- Paginated scans retain a cursor between bounded runs and repeat full sweeps.
  Invitation creation time is not used as an acceptance-time watermark.
- A per-account lease serializes sync and disconnect; bounded execution yields
  before the worker deadline and safely replays unfinished pages.
- New leads use source `LinkedIn`, status `NEW`, and the connecting member as
  owner. Existing matched leads retain their owner, stage, and saved details.
- Workspace/app/member uniqueness and transactional invitation receipts prevent
  repeat lead creation and duplicate acceptance activities.
- Valid LinkedIn identities remain visible and survive CRM cleanup without
  requiring a phone number.
- Intake does not send messages or create FMS jobs. Automatic welcome retries
  exclude LinkedIn-origin leads.
- Revoked workspace access, invalid tokens, or denied API permission stop sync.
  Expired tokens require member reconnection; no unapproved refresh capability
  is assumed.

## Returned information and limitations

Only approved fields returned by the Invitations API are used:
member identifier, first/last name, and optionally headline and vanity name
(used to construct the documented public profile URL). Missing details stay
empty. Company, email, phone, and full employment history are not inferred from
the headline.

The UI records when acceptance was **detected**, not an invented acceptance
timestamp. A connection is not labelled a qualified sales opportunity.

Messages and conversation history are not provided by this integration.
They require separate official LinkedIn access and a separately reviewed data
contract.

Existing non-LinkedIn leads without a saved LinkedIn identity cannot be matched
reliably by name alone. Users can use the existing CRM merge workflow when they
identify such a duplicate; sync follows existing merge pointers.

Hourly polling is not real-time. Large histories require multiple scheduled
runs, and the queue processes a bounded number of accounts per invocation.
Initial account activity during the baseline scan is not imported. Start
outreach after the screen reports `Monitoring`.

## Official access required

The relevant endpoint is:

`GET https://api.linkedin.com/v2/invitations?q=inviter&states=ACCEPTED`

LinkedIn restricts this API to approved partners under an API agreement. Before
activation, confirm that the grant includes reading accepted outbound requests
and retaining the permitted returned fields for this multi-client CRM use.
Ordinary LinkedIn sign-in and Sales Navigator Profile Associations do not
establish that approval. Do not guess the partner permission names.

Sources:

- [Invitations API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/invitations)
- [OAuth authorization flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)
- [OpenID Connect member identity](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [Basic profile fields](https://learn.microsoft.com/en-us/linkedin/shared/references/v2/profile/basic-profile)

## Deployment configuration

Configure these through the deployment's secret/environment settings. Never
paste client secrets, tokens, or the encryption key into a chat or commit.

| Variable | Required value |
| --- | --- |
| `LINKEDIN_CLIENT_ID` | Approved application's client ID |
| `LINKEDIN_CLIENT_SECRET` | Approved application's client secret |
| `LINKEDIN_INVITATION_SCOPES` | Space-separated read scopes actually granted by LinkedIn |
| `LINKEDIN_INVITATION_PROFILE_FIELDS` | Comma-separated approved fields; must include `firstName,lastName`; optional `headline,vanityName` |
| `LINKEDIN_REDIRECT_URI` | Registered HTTPS callback ending in `/api/integrations/linkedin/callback` |
| `LINKEDIN_TOKEN_ENCRYPTION_KEY` | A cryptographically random 32-byte key encoded as 64 hex characters |
| `LINKEDIN_CRM_ACCESS_APPROVED` | Set to `true` only after confirming the API grant and permitted CRM storage |
| `CRON_SECRET` | Existing Vercel cron authentication secret |

The same LinkedIn application also needs the OpenID Connect product with
`openid profile` to identify the account authorising access. The integration
adds those two scopes; it does not request the member's email.

For the main deployment, register
`https://sheetomatic.com/api/integrations/linkedin/callback` exactly. Preview
environments need their own registered callback and environment configuration.
Keep secrets scoped to the intended environment.

Workspaces on subdomains of the callback host require Sheetomatic's existing
`AUTH_COOKIE_DOMAIN` configuration to share the login session with the callback
host. Unrelated custom domains require a dedicated, registered configuration;
the start action rejects them rather than redirecting credentials elsewhere.

## Database and release

`20261020150000_linkedin_accepted_connections` adds a lead-source enum value,
five nullable identity/display fields, three integration tables, indexes and
foreign keys. It contains no updates/deletions of existing lead records.
Apply the reviewed migration before deploying queries that select the new
columns.

Current production is assembled through preservation scripts and contains
changes beyond Git main. A future production release must retain that
preparation chain and apply this focused change; deploying the entire local
checkout would overwrite unrelated live changes.

## Review and activation

Before enabling production sync, verify the real partner grant, allowed profile
fields, registered callback, client account consent, initial baseline behaviour,
pagination, duplicate handling, revoked/expired accounts, workspace isolation,
and rendering with absent contact fields.

Prisma client generation, application-source TypeScript compilation, and ESLint
on the new integration modules passed.
The full repository type-check encounters existing errors in generated Fleet
route references and unrelated test sources. No automated tests have been added
or run. The actual LinkedIn OAuth and acceptance flow cannot be exercised without
approved access.
