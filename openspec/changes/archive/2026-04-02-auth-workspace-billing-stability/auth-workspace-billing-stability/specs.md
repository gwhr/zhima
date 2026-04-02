# Specs: Auth / Workspace / Billing Stability + Email Verification

## Functional requirements

1. Logged-in users must have a visible path back to `/` from dashboard navigation.
2. Workspace list API payload anomalies must not crash UI rendering.
3. Workspace detail payload anomalies must not trigger full-page error state.
4. Billing page must support partial data rendering when one or two APIs fail.
5. Email registration must require a valid email verification code before user creation.
6. Email verification code endpoint must enforce cooldown and anti-abuse limits.

## Non-functional requirements

1. Error handling should fail soft (degrade to empty blocks) for non-critical data.
2. Rate-limiting and verify-attempt lock should be Redis-based for consistency.
3. SMTP credentials must be configurable via environment variables.
4. Build must remain green (`pnpm build`).

## API behavior requirements

1. `/api/billing/ledger` should return success with empty array on schema-not-ready (`P2021/P2022`).
2. `/api/billing/tokens` should return fallback summary on schema-not-ready (`P2021/P2022`).
3. `/api/auth/send-email-code` should return:
   - `200` when send accepted
   - `429` when rate-limited
   - `502` when provider failure
   - `400` for invalid input

