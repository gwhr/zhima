# ROADMAP Addendum - 2026-03-25

This addendum records the 2026-03-25 delivery set and corresponding archive path.

## Delivered

- Admin alignment fixes
  - admin dashboard stats mapping
  - admin users list/API alignment and token summary
  - admin orders page/API cleanup
- Admin P0 first batch
  - workspace management (`/admin/workspaces`)
  - task center (`/admin/tasks`)
  - token/AI usage (`/admin/usage`)
- Template flow update
  - user workspace template upload disabled (HTTP 410)
  - platform template managed in admin (`/admin/templates`)
- New admin modules
  - announcements (`/admin/announcements`)
  - platform config (`/admin/platform`)
- Risk-control thresholds
  - platform: default user concurrency / retry limit / single-task token hard cap
  - user-level concurrency override (`/api/admin/users/[id]/risk-control`)
  - queue dispatch guard and worker hard-cap stop

## Archive

- `openspec/changes/archive/2026-03-25-admin-p0-upgrade/admin-p0-platform`
- `openspec/changes/archive/2026-03-25-risk-control-thresholds/task-risk-control`

## Execution Order (Locked)

1. Fix admin alignment issues first and keep current pages stable.
2. Deliver Admin P0 batch: workspace management, task center, token/AI usage.
3. Keep thesis template upload/activation in admin only; unify platform template for all users.
4. Then complete system announcement and platform configuration.
5. For every feature point, update OpenSpec before implementation and archive after self-test.
