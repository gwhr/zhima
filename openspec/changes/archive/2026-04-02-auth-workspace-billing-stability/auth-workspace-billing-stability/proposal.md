# Proposal: Auth / Workspace / Billing Stability + Email Verification

## Why

Recent browser verification surfaced practical blockers:

1. users lack a clear homepage return path after login
2. workspace pages can fail hard when payload shape drifts
3. billing page fails entirely when one sub-request fails
4. email register flow has no verification-code security gate

These issues reduce trust and block core workflow continuity.

## Scope

1. Add explicit homepage entry in logged-in navigation surfaces.
2. Add front-end normalization and defensive rendering for workspace list/detail.
3. Change billing loading to partial-failure tolerant mode with granular user messages.
4. Add email verification code sending/validation with rate-limits and SMTP support.
5. Add environment variables for email channel configuration.

## Out of scope

1. payment channel business changes
2. runtime preview architecture changes
3. homepage logged-in personalized content redesign

