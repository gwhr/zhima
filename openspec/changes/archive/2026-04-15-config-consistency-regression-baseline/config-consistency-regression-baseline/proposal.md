# Proposal: Config Consistency and Regression Baseline

## Why

Recent handover drift showed that the project already had working code for payment closure, workspace stability, feedback pagination, and env alignment, but the summary docs still described them as pending issues.

To reduce this mismatch in future sessions, the project needs one living baseline document that is updated whenever config assumptions or critical runtime flows change.

## Scope

1. Introduce a canonical living document for config consistency and regression baseline.
2. Define what kinds of changes must update that document in the same turn.
3. Add the document to handover reading order and current OpenSpec summary.

## Out of scope

1. Changing runtime behavior itself.
2. Reworking deployment architecture.
3. Replacing detailed feature-level OpenSpec archives.
