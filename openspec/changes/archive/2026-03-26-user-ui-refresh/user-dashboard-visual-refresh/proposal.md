# Proposal: User Dashboard Visual Refresh

## Why

Current user pages are functional but visually flat, with weak hierarchy and limited brand character.  
This impacts first impression, perceived quality, and demo/recording effectiveness.

## What changed

1. Refresh user-side visual tokens (color, spacing, font stack, background atmosphere).
2. Redesign navigation surfaces (navbar + sidebar) with clearer active state and improved density.
3. Redesign dashboard homepage for stronger overview and action focus.
4. Redesign workspace list page for better browsing and creation flow.
5. Apply consistent card/surface polish on workspace detail page without changing business logic.
6. Upgrade auth pages (`/login`, `/register`) to align with the same visual language.

## Scope and safety

- Scope: user-facing routes only (`/login`, `/register`, `/dashboard`, `/workspace`, `/workspace/:id`) and shared styling foundations used by user pages.
- No API contracts, data models, or generation logic were changed.
