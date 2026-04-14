# Specs: Thesis Partial Online Preview

## Functional requirements

1. For `THESIS` files, non-admin users must receive partial inline content in file preview responses.
2. Preview truncation length must be configurable via environment variable `THESIS_PREVIEW_CHAR_LIMIT`, with default fallback.
3. For thesis `.docx` files, preview response must return an inline guidance placeholder rather than full binary content.
4. Preview API must include:
   - `previewLimited` (boolean)
   - `previewNotice` (string | null)
   - `totalChars` (number | null)
5. Frontend file preview dialog must surface `previewNotice` visually when provided.
6. Existing download gating (`requireRechargeForDownload` + recharge entitlement) must remain effective and unchanged for full artifact download.

## Non-functional requirements

1. Preview behavior must be deterministic and consistent across repeated requests.
2. Failure in recharge-status lookup should degrade safely without exposing full thesis content in preview.
3. UI messaging must clearly communicate that online preview is partial and full content is obtained through download.
