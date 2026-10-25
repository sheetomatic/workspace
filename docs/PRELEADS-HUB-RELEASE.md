# Preleads hub — 25 October 2026

Application revision: `4b1898688f3c6b3ea122b7935ee2251cf05bc0b8`, PR #83, preserving source `658b1a2` and deployment `dpl_7en6keCCLUK9BVrKpdipbHJjRdaT`. Candidate `dpl_9a88nq7gBnWHsm8hn4rbmVhwtc8m` is not a live assertion until activation is recorded below.

Shared Meta / Website Traffic / Subscribers tabs preserve the selected 7/30-day window. Traffic and subscriber screens match the Meta canvas visual language. All remain primary-website-administrator-only.

Meta account totals still cover all ads. A separate ad-level Insights table shows ad/campaign/ad-set names, IDs, spend, impressions, reach, clicks and CTR. It reports the chosen period, not current delivery status. First 100 returned ads only; pagination is explicitly marked partial. No automated next URL is followed. Account reach is never summed from ad reach; unavailable details do not imply no running ads.

Prepared email subscription work integrated without copying older release scripts: separate opt-in newsletter form in public footer, confirmation required for ACTIVE status, unsubscribe flow, admin summary/detail dashboard and minimal additive WebsiteSubscriber table. Website analytics consent does not subscribe visitors. Workspace account registrations are not represented by newsletter counts. No bulk mail scheduler or WhatsApp follow-up was enabled. Existing Resend configuration reused; real email deliverability remains untested. Signup counts describe retained latest request dates, not lifetime attempt events; UI discloses cleanup/resubscription behavior.

Verification: 578 unit tests; four isolated Postgres integration tests for duplicates, confirmation, unsubscribe, failed delivery and rate limits; repeated additive migration check; full local 257-page build/typecheck. Browser checks at 1440/390/320 covered shared tabs, Meta table, traffic/subscriber empty report, mock signup and mock confirmation without real messages. No overflow or page errors. Production staging validates existing sender configuration, new schema, summary/daily/ad-level Meta access and route/auth/origin guards. No real customer submissions, payment or ad mutations in testing.

Independent earlier subscriber changes remain preserved in /workspace/consolidated-release; they are now incorporated here, so do not deploy that stale worktree over this release. Original logo work remains separate.

LIVE: both domains assigned to `dpl_9a88nq7gBnWHsm8hn4rbmVhwtc8m` and re-read after READY, source verification and all 23 staged checks passed. Public homepage/pricing return 200 and contain the subscription form; manage page returns 200; Meta/subscriber report routes require login (307). Live Playwright public-page check was blocked by browser CA trust (`ERR_CERT_AUTHORITY_INVALID`); TLS validation was not disabled. Earlier isolated browser checks passed, but signed-in production UI and real email delivery remain unverified. No real signup/email was submitted.
