# Specs: Workspace Delivery and Showcase

## Functional requirements

1. The create-workspace modal flow must remain requirement-first.
   - Users should still be able to choose a topic or enter topic plus feature points.
   - AI should still organize requirements before workspace creation.
   - Users should still confirm requirements before code generation.

2. Workspace detail must become a delivery workbench rather than a runtime-preview surface.
   - The page should present a clear phase/progress frame.
   - The requirement document should appear as the first primary reading block under the workspace header.
   - The main content should emphasize requirement confirmation, generation actions, delivery artifacts, and AI collaboration.
   - Lightweight phase guidance and workspace overview may remain as secondary sidebar content.

3. Runtime-preview concepts must be removed from the main user-facing workspace workflow.
   - The user surface must not present runtime queue, session limit, remaining runtime, preview free-limit, or runtime-preview launch controls.
   - Source browsing should remain available for generated code artifacts.

4. Non-core operational content must not dominate workspace detail.
   - Token usage, one-to-one support, and generic statistics must not occupy primary workspace cards on the delivery page.
   - Those concerns should live on dedicated pages or other secondary surfaces instead of interrupting the requirement-to-delivery narrative.

5. Source browsing must be positioned as a delivery feature.
   - Users must be able to browse generated source files.
   - Users must be able to switch between `core` and `full` source scope.
   - Users must be able to download generated project artifacts without a second preview-specific paywall.

6. Code generation must be the primary monetization trigger in the main project flow.
   - The workspace should clearly communicate that code generation consumes Token points.
   - Users should encounter recharge guidance when code generation cannot start because of insufficient balance.

7. The product must provide a standalone showcase entry.
   - Showcase content must be clearly labeled as curated platform cases, not as live runtime of the user's current project.
   - The first implementation may use placeholder case content while the real curated projects are still being prepared.

## Non-functional requirements

1. Product wording should be consistent across README, handover, regression-baseline docs, and the active OpenSpec change.
2. The removal of runtime-preview UI should not break source browsing, generation, thesis, or download flows.
3. Changes affecting workspace flow, billing trigger, showcase positioning, or download expectations must update `docs/config-consistency-regression-baseline.md` in the same change.
4. Production verification should confirm that the deployed workspace page still serves successfully after the layout refinement.
