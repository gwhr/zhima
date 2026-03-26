# Specs: Admin Audit Log

## Functional requirements

1. System MUST persist audit records for key admin write operations.
2. Each record MUST include operator, action, target, and operation timestamp.
3. System SHOULD store before/after snapshots when available.
4. Audit logging MUST NOT block primary operation success.
5. Admin MUST be able to query and browse audit logs in backend UI.

## Operation coverage in MVP

1. platform config update
2. user concurrency override update
3. thesis template upload
4. thesis template activate
5. thesis template delete
6. announcement publish
