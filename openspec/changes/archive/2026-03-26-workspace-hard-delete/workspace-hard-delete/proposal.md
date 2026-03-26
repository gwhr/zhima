# Proposal

## Why

Users expect workspace deletion to remove the item permanently.
Current behavior marks workspace as expired, causing deleted expired entries to reappear after reload.

## What Changes

1. DELETE `/api/workspace/[id]` changes from status-update to hard-delete.
2. Delete authorization supports workspace owner and admin.
3. Storage files under the workspace are cleaned in best effort before DB delete.
