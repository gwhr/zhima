# OSS Real Storage Archive (2026-03-19)

## Module

- `oss-real-storage`

## Completed Scope

- Added real Aliyun OSS SDK integration (`ali-oss`) with local fallback.
- Implemented unified storage adapter:
  - auto detect provider (`local` / `oss`)
  - secure storage-key sanitization
  - upload, download, delete, exists
- Refactored runtime paths to storage adapter:
  - chat project context code file loading
  - apply-code write path
  - workspace package download (zip)
  - workspace file content preview
  - worker generated files write path
  - template upload/delete lifecycle
- Normalized env templates for production/dev:
  - `STORAGE_PROVIDER`
  - `OSS_REGION`
  - `OSS_ENDPOINT`
  - `OSS_BUCKET`
  - `OSS_ACCESS_KEY_ID`
  - `OSS_ACCESS_KEY_SECRET`
  - compatibility fields retained (`OSS_ACCESS_KEY`, `OSS_SECRET_KEY`)

## Verification

- Unit tests: `npx pnpm test:run` passed.
- Browser smoke test: `npx pnpm test:e2e` passed.
- Storage adapter smoke:
  - upload -> exists -> download -> delete -> not exists (passed).

## Notes

- Existing unrelated TypeScript issues remain in auth/queue/thesis modules.
- OSS credentials should be managed in local `.env.local` and rotated if exposed.
