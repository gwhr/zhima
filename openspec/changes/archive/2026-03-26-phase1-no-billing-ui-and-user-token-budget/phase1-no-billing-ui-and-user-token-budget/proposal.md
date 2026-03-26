# Proposal

## Why

Phase-1 launch should avoid exposing payment purchase UI before compliance and filing are completed.
At the same time, operations still need a practical control lever to manage user token cost.

## What Changes

1. Hide user-facing billing entries (`套餐管理` / plan purchase entrances).
2. Keep backend payment capabilities untouched for future re-enable.
3. Introduce per-user token budget override:
   - Admin can set custom total token budget for one user.
   - Empty value resets user to platform default budget.
4. Token budget checks and summaries should use user override if present.

## Impact

- User experience: no visible payment feature in phase-1.
- Operations: can control individual user token cap without changing global config.
- Future billing relaunch remains possible with minimal code restore.
