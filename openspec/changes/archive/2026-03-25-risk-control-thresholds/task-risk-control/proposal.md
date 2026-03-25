# Proposal: Admin Task Risk Control Thresholds

## Why

Current token quota only controls total budget, but cannot prevent:

1. burst task submissions exhausting queue capacity
2. failed jobs retry loops consuming cost
3. single oversized tasks consuming too many tokens at once

## Scope

1. Platform-level defaults in admin config:
   - default user task concurrency limit
   - same-task failure retry limit
   - single task token hard cap
2. User-level override:
   - per-user task concurrency limit override
3. Execution enforcement:
   - block new task when user active jobs hit concurrency limit
   - apply queue retry attempts from platform setting
   - hard stop code/thesis generation when task token usage exceeds cap
