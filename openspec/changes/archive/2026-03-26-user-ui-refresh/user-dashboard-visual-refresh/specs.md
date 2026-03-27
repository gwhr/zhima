# Specs: User Dashboard Visual Refresh

## Requirements

### 1) User shell visual baseline

- The dashboard layout MUST provide a clear layered background and elevated content surface.
- The top navigation MUST expose active route context for core user routes.
- The left sidebar MUST keep existing navigation semantics while improving active/hover affordance.

### 2) Dashboard homepage hierarchy

- The dashboard homepage MUST provide a high-priority hero summary area.
- Statistical cards MUST remain data-accurate and gain stronger visual differentiation.
- Quick entry actions MUST remain intact and become easier to scan.

### 3) Workspace list usability

- Workspace creation entry MUST remain primary and always visible.
- Workspace cards MUST preserve existing click behavior and delete behavior.
- Empty state MUST remain actionable and visually clear.

### 4) Workspace detail continuity

- Workspace detail MUST preserve all existing generation flow logic and gating behavior.
- Workspace detail MUST receive consistent surface styling upgrades (header area and major cards).

### 5) Auth page consistency

- Login and register pages MUST keep existing auth behaviors and API calls unchanged.
- Login and register pages MUST align to the same visual language as dashboard routes.

### 6) Non-functional

- No backend API or schema changes are allowed for this change package.
- Existing user flows MUST remain backward compatible.
