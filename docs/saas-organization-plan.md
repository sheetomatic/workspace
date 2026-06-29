# Organization plan architecture

## Decision

Sheetomatic stores subscription identity on a dedicated `OrganizationPlan` record (1:1 with `Organization`) while keeping denormalized plan columns on `Organization` for backward-compatible reads and existing APIs.

## Model

`OrganizationPlan` tracks:

- `plan` (`OrgPlan`)
- `status` (`PlanSubscriptionStatus`)
- `billingPeriod` (`PlanBillingPeriod`)
- `trialEndsAt`, `renewalAt`, `activatedAt`
- audit timestamps

`Organization` continues to expose `plan`, `planStatus`, `billingPeriod`, `allowedModules`, and limits for fast entitlement checks in hot paths.

## Resolution

- `getOrganizationPlanSnapshot()` reads `OrganizationPlan` first and falls back to `Organization` columns when the plan row is missing.
- `getOrganizationPlanContext()` uses the snapshot for lifecycle metadata and `Organization` for entitlements and usage counts.
- `applyOrganizationEntitlements()` writes both tables in one transaction.
- Workspace activation (`activatePendingWorkspaceBySlug`) upserts the plan row when a tenant moves from `ONBOARDING` to `ACTIVE`.

## Tenant safety

Plan rows are always keyed by `organizationId` with a unique constraint. Cross-tenant plan reads are prevented by scoping queries to the active session organization id.

## Billing readiness

Trial and renewal dates live on `OrganizationPlan` so future billing webhooks can update lifecycle state without rewriting entitlement modules on `Organization`.
