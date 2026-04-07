# Proposal: Source Scope Preview + Key-Page Runtime Preview

## Why

Users need faster confidence before download/payment:

1. File preview should not overwhelm first-time users with all files immediately.
2. Download result should be consistent with what the user previewed.
3. Runtime preview should show clear, product-like key pages instead of a single generic mock screen.

## Scope

1. Add `core/full` scope switching for source preview.
2. Make source zip download respect selected scope (`core` vs `full`).
3. Replace runtime preview page UI with key-page tabs (`home preview`, `list preview`, `admin preview`) while keeping queue/session guardrails unchanged.
4. Keep preview as controlled static key-page rendering (not full project sandbox execution).

## Out of scope

1. Full isolated runtime sandbox for arbitrary generated stacks.
2. Billing strategy or payment callback workflow changes.
