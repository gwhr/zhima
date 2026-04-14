# Proposal: Thesis Online Preview Partial Visibility

## Why

Users can currently inspect too much thesis content in online preview.  
Product policy requires:

1. Keep online preview as a confidence signal only.
2. Keep complete thesis content in downloadable artifacts.
3. Preserve recharge gating for full download where configured.

## Scope

1. Update thesis file preview API to return partial content for non-admin users.
2. Keep `.docx` as non-inline binary preview with explicit guidance.
3. Return preview metadata (`previewLimited`, `previewNotice`, `totalChars`) for frontend messaging.
4. Keep existing download gating behavior unchanged and still controlled by platform policy.

## Out of scope

1. Changes to token pricing, recharge package design, or payment provider callback flow.
2. Changes to admin privileges (admins can still inspect full internal content as needed).
