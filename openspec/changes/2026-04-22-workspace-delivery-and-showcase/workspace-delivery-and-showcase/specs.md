# Specs: Workspace Delivery and Showcase

## Functional requirements

1. The create-workspace modal flow must remain requirement-first.
   - Users should still be able to choose a topic or enter topic plus feature points.
   - AI should still organize requirements before workspace creation.
   - Users should still confirm requirements before code generation.

2. Workspace detail must become a delivery workbench rather than a runtime-preview surface.
   - The page should present a clear phase/progress frame.
   - The main content should emphasize requirement confirmation, generation actions, system status, and AI collaboration.
   - A persistent requirement-document area should remain visible as the user works.

3. Runtime-preview concepts must be removed from the main user-facing workspace workflow.
   - The user surface must not present runtime queue, session limit, remaining runtime, preview free-limit, or "启动运行预览" controls.
   - Source browsing should remain available for generated code artifacts.

4. Source browsing must be positioned as a delivery feature.
   - Users must be able to browse generated source files.
   - Users must be able to switch between `core` and `full` source scope.
   - Users must be able to download generated project artifacts without a second preview-specific paywall.

5. Code generation must be the primary monetization trigger in the main project flow.
   - The workspace should clearly communicate that code generation consumes Token points.
   - Users should encounter recharge guidance when code generation cannot start because of insufficient balance.

6. The product must provide a standalone showcase entry.
   - Showcase content must be clearly labeled as curated platform cases, not as live runtime of the user's current project.
   - The first implementation may use placeholder case content while the real curated projects are still being prepared.

## Non-functional requirements

1. Product wording should be consistent across README, handover, and regression-baseline docs.
2. The removal of runtime-preview UI should not break source browsing, generation, thesis, or download flows.
3. Changes affecting workspace flow, preview flow, billing trigger, or download gating must update `docs/config-consistency-regression-baseline.md` in the same change.
