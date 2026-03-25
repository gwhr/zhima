# admin-p0-platform - Design

## Data and API
- New admin APIs:
  - `GET /api/admin/workspaces`
  - `GET /api/admin/tasks`
  - `GET /api/admin/usage`
  - `GET/POST /api/admin/announcements`
  - `GET/PATCH /api/admin/platform-config`
  - `GET/POST /api/admin/templates`
  - `PATCH/DELETE /api/admin/templates/[templateId]`

## Data model extensions
- `SystemConfig` for persistent platform runtime config
- `ThesisTemplate` for platform-level template management
- `Announcement` for admin-published notices

## Flow changes
- Workspace-side template upload endpoint is disabled for users
- Template operations are moved to admin side
- Code/Thesis generation quota checks now use platform config fallback logic
- Job enqueue payload now carries model override from platform config

## Admin UI
- Added pages:
  - `/admin/workspaces`
  - `/admin/tasks`
  - `/admin/usage`
  - `/admin/templates`
  - `/admin/announcements`
  - `/admin/platform`
