# Proposal: Admin Model Management

## Why

Model failures are currently hard to recover quickly because API keys are only in environment variables.

Operators need to:

1. rotate keys from admin UI
2. switch code/thesis model without redeploy
3. verify current key source (admin override vs env fallback)

## Scope

1. Add admin page: `/admin/models`
2. Add admin API: `GET/PATCH /api/admin/models`
3. Persist provider key overrides in `SystemConfig`
4. Encrypt key overrides before storage
5. Make AI runtime resolve models from admin-managed key config
