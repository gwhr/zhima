# Change Set: Phase-1 No Billing UI + User Token Budget Override

## Context

For phase-1 launch (before ICP filing and payment compliance is ready):

1. Frontend payment/plan purchase entry points should be hidden.
2. Platform still runs with owner-provided model keys and token budget control.
3. Admin must be able to set per-user total token budget to support operations.

## Scope

- Hide plan/payment related entrances in user-facing UI.
- Add per-user token budget override management in admin console.
- Keep payment APIs in codebase but remove user-facing exposure for phase-1.

## Non-goals

- No third-party payment integration changes in this iteration.
- No token recharge/order redesign in this iteration.
