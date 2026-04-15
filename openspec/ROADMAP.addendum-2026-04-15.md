# ROADMAP Addendum - 2026-04-15

This addendum records the delivery set completed after the 2026-03-25 addendum and corrects outdated handover assumptions.

## Delivered since 2026-03-29

- Token-points billing upgrade
  - transactional wallet / ledger / reservation / recharge / rollback
  - user billing page switched to balance + recharge + ledger
  - payment callback settles by runtime recharge plan config
- User feedback feature
  - user-side text + image feedback submission and paginated history
  - admin feedback page with pagination, keyword search, status update, and admin note
  - protected image access and admin audit logging
- Runtime preview queue
  - queueing, free-limit policy, timed session expiration, recharge bypass
- Workspace / auth / billing hardening
  - homepage entry for logged-in users
  - workspace list/detail normalization and fail-soft rendering
  - billing page partial-failure tolerant loading
  - email verification code registration flow
- Funnel and platform config updates
  - free workspace limit
  - download gating by recharge entitlement
  - support contact block / QR
  - runtime-editable and publishable recharge plans
- Preview policy updates
  - source preview `core/full` scope switch and scope-aware source download
  - runtime key-page tabs (`home`, `list`, `admin`)
  - thesis online preview partial visibility for non-admin users
- Handover / maintenance baseline
  - add a living config-consistency and regression-baseline document
  - require future config/runtime-sensitive changes to keep that document in sync

## Primary archive references

- `openspec/changes/archive/2026-03-29-token-points-billing/token-points-billing`
- `openspec/changes/archive/2026-03-31-workspace-flow-and-runtime-preview/workspace-flow-and-runtime-preview`
- `openspec/changes/archive/2026-04-02-auth-workspace-billing-stability/auth-workspace-billing-stability`
- `openspec/changes/archive/2026-04-02-free-tier-funnel-and-support-contact/free-tier-funnel-and-support-contact`
- `openspec/changes/archive/2026-04-02-token-plan-publish-config/token-plan-publish-config`
- `openspec/changes/archive/2026-04-07-source-preview-scope-and-key-pages/source-preview-scope-and-key-pages`
- `openspec/changes/archive/2026-04-14-thesis-online-preview-partial/thesis-online-preview-partial`
- `openspec/changes/archive/2026-04-15-user-feedback-feature/user-feedback-feature`
- `openspec/changes/archive/2026-04-15-config-consistency-regression-baseline/config-consistency-regression-baseline`

## Resolved concerns

1. Payment callback / wallet closure is already handled transactionally in `/api/payment/notify`.
2. Workspace create / list / detail stability has already been hardened and schema-not-ready cases degrade explicitly.
3. User feedback submit / list / admin pagination is already implemented.
4. Local / production env templates are already aligned for payment, SMS, email, OSS, and model config.

These items should be treated as regression checkpoints, not as the default top-priority backlog for new sessions.

## Current priorities

1. Real OSS integration in production.
2. Deployment documentation, backup scripts, and HTTPS hardening.
3. Post-deploy regression verification for workspace creation, payment callback settlement, feedback flow, and admin pages.
4. Future feature work should follow the latest product request rather than reopening the above resolved stability topics by default.

## Execution note

When adding new work, continue the standard OpenSpec workflow:

1. proposal / specs / tasks before implementation
2. implement
3. self-test
4. archive

If the change affects config assumptions, env variables, startup, payment, SMS, email, storage, model config, workspace, billing, feedback, preview, or download gating, also update `docs/config-consistency-regression-baseline.md` in the same change.
