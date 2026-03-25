# Design: Task Risk Control

## Data model

1. `User.taskConcurrencyLimitOverride Int?`
   - nullable, fallback to platform default when null

## Platform config extension (`platform:settings`)

1. `defaultUserTaskConcurrencyLimit` (int, min 1)
2. `taskFailureRetryLimit` (int, min 0)
3. `singleTaskTokenHardLimit` (int, min 1000)

## Enforcement points

1. API dispatch layer
   - `generate-code`, `generate-thesis`, `generate-chart`
   - checks active jobs (`PENDING`/`RUNNING`) by user via workspace relation
   - rejects with 429 when hitting concurrency limit
   - injects queue attempts from retry limit
2. Worker execution
   - accumulates token usage for code/thesis generation
   - throws immediately when usage exceeds hard cap
   - marks failed jobs as `PENDING` when retry remains, else `FAILED`

## Admin UX

1. Platform config page includes all three thresholds
2. User list supports setting per-user concurrency override
