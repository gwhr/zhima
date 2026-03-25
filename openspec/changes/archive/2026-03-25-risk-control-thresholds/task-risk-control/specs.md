# Specs: Task Risk Control

## Functional requirements

1. Admin can configure platform defaults:
   - default concurrency limit per user
   - retry limit for failed jobs
   - hard token cap per task
2. Admin can override concurrency limit for specific users.
3. System must block task dispatch when user active jobs reach effective limit.
4. System must apply queue retry attempts according to configured retry limit.
5. System must terminate code/thesis task when accumulated token usage exceeds hard cap and return a split-demand guidance message.

## Non-functional requirements

1. Defaults are backward compatible via env fallback.
2. Limits are bounded and validated to avoid invalid config.
3. Enforcement must be deterministic and auditable from task records.
