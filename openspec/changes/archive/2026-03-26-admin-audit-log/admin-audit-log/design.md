# Design: Admin Audit Log

## Data model

`AdminAuditLog`

1. actor info: `adminUserId` (nullable for safety)
2. action info: `action`, `module`
3. target info: `targetType`, `targetId`
4. change detail: `summary`, `before`, `after`, `metadata`
5. timestamp: `createdAt`

## Write strategy

1. Unified utility `logAdminAudit`.
2. Called in key admin APIs after successful write action.
3. Wrapped with internal try/catch so business action succeeds even if logging fails.

## Read strategy

1. `GET /api/admin/audit-logs`
2. Supports paging + keyword search (`action`/`module`/`summary`/admin identity)
3. Returns admin profile snapshot and JSON payload for before/after metadata.

## UI

1. New admin page `/admin/audit-logs`.
2. Read-only table with filters:
   - keyword
   - module
3. Shows:
   - time
   - action/module
   - operator
   - target
   - summary
