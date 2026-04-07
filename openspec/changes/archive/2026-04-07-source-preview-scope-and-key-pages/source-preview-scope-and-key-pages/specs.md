# Specs: Source Scope and Key-Page Preview

## Functional requirements

1. Workspace file preview must provide a user-visible scope switch with options `core` and `full`.
2. In `core` scope, code file list must be filtered by core-path rules while thesis/chart files remain accessible.
3. Switching scope must keep file selection valid; when the selected file is out of scope, the first available file should be auto-selected.
4. Source download action must pass selected scope and backend download API must return matching code subset.
5. Runtime preview page must provide three key-page views: home page, list page, and admin page.
6. Runtime preview queue/session constraints must remain effective: pending/running/end states, auto-refresh, and timed session expiration.

## Non-functional requirements

1. Scope switching and download feedback should be explicit to reduce uncertainty.
2. Key-page preview should be responsive for desktop/mobile iframe sizes.
3. Existing runtime guardrails must not regress (concurrency/queue/timeout behavior).
