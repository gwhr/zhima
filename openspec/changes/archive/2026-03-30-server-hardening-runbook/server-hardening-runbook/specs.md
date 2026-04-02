# Specs: Server Hardening Runbook

## Operational requirements

1. Hardening steps must be executable in sequence with explicit pre-checks.
2. Rules should cover SSH, HTTP/HTTPS, and application-required ports only.
3. Rollback instructions must exist before high-risk changes are applied.
4. Changes should preserve remote access continuity during rollout.

## Non-functional requirements

1. Runbook should be idempotent where possible.
2. Instructions should be simple enough for single-operator execution.

