# admin-p0-platform - Specs

## Admin Workspaces
### GET `/api/admin/workspaces`
- Query:
  - `page`, `pageSize|limit`, `search`, `status`
- Response:
  - paginated workspace list
  - owner info
  - file/task/chat counts
  - token usage and AI cost

## Admin Tasks
### GET `/api/admin/tasks`
- Query:
  - `page`, `pageSize|limit`, `search`, `status`, `type`
- Response:
  - paginated job list
  - workspace/user context
  - stage/model/token metadata from job result
  - status summary counters

## Admin Usage
### GET `/api/admin/usage`
- Query:
  - `days` (1~90)
- Response:
  - period/all-time summary
  - grouped stats by model/task/user
  - daily trend

## Announcements
### GET `/api/admin/announcements`
- Query: `limit`
- Response: announcement list with creator

### POST `/api/admin/announcements`
- Body:
  - `title`, `content`, `level`, optional `userId`
- Behavior:
  - create announcement record
  - fan-out system notifications

## Platform Config
### GET `/api/admin/platform-config`
- Response:
  - persisted config
  - model options

### PATCH `/api/admin/platform-config`
- Body: partial config
- Validates numeric/boolean/model fields

## Templates
### GET `/api/admin/templates`
- Response: template list and active state

### POST `/api/admin/templates`
- FormData:
  - `file`, optional `name/version/note`, `activate`
- Behavior:
  - upload to storage
  - create template record
  - optional activate

### PATCH `/api/admin/templates/[templateId]`
- Body: `{ action: "activate" }`

### DELETE `/api/admin/templates/[templateId]`
- Deletes non-active template

## Workspace Template Upload
### POST `/api/workspace/[id]/upload-template`
- Returns HTTP 410 with guidance to admin template management
