# Proposal: Admin Audit Log (MVP)

## Why

Platform already supports high-impact admin operations:

1. update platform config
2. change user risk-control override
3. upload / activate / delete thesis templates
4. publish system announcements

Without audit records, troubleshooting and rollback become difficult even for single-admin operations.

## Scope

1. Add persistent admin audit log table.
2. Add log writer utility with safe fallback (log failure does not break business operation).
3. Log key admin write operations listed above.
4. Provide admin log query API and admin log page.
