# Workspace Delete Reappearance Fix (2026-03-26)

## Problem

Deleting an expired workspace returned success in UI, but after reload the item appeared again.

## Root Cause

The DELETE endpoint only updated workspace status to `EXPIRED` instead of physically deleting.
For already expired entries, this made no persisted state change, so list reload showed the same item.

## Completed Fix

- Changed workspace DELETE endpoint to hard delete from DB.
- Added admin delete permission parity (`owner OR admin`).
- Added best-effort storage object cleanup for workspace files before DB deletion.

## Verification

- Browser flow test:
  - login admin
  - open `/workspace`
  - delete expired workspace
  - refresh page
  - deleted workspace no longer appears
- `npx pnpm build` passed.
