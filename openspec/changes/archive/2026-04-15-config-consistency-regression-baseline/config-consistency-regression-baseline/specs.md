# Specs: Config Consistency and Regression Baseline

## Functional requirements

1. The project must maintain a canonical living document at `docs/config-consistency-regression-baseline.md`.
2. That document must record:
   - config source-of-truth files
   - expected local vs production differences
   - minimal runtime regression checklist
   - change categories that require document sync
3. Handover guidance must reference this living document in the default reading order.
4. OpenSpec summary docs must reflect that resolved runtime/config issues should become regression checkpoints instead of being repeatedly treated as open backlog.

## Process requirements

1. Any change affecting environment variables, platform config defaults, payment, SMS, email, storage, model-provider config, worker startup, workspace flow, billing flow, feedback flow, preview flow, or download gating must update `docs/config-consistency-regression-baseline.md` in the same change.
2. The living document must stay at a stable path so future sessions can rely on it.

## Non-functional requirements

1. The document should be concise enough for new-session onboarding.
2. The document should be specific enough to guide regression after deployment-sensitive changes.
