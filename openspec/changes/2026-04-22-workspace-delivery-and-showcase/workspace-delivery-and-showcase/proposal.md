# Proposal: Workspace Delivery Workbench and Showcase Reframe

## Why

The product no longer wants to promise "online running preview" for user-generated projects.

That capability is expensive to maintain, hard to scale, and creates product wording that overstates what the platform actually delivers. The stable value of the product is now:

1. requirement confirmation
2. code generation
3. source browsing and source download
4. thesis generation
5. curated showcase references

Because runtime preview is being removed from the core story, the workspace surface needs a new structure that keeps user confidence high without relying on preview queue, session, or timed-runtime concepts.

## Scope

1. Keep the current create-workspace wizard as the pre-generation entry flow.
2. Redesign workspace detail into a delivery-oriented workbench with clearer phase guidance.
3. Remove runtime-preview UI concepts from the main user workflow.
4. Keep source browsing as the default artifact-inspection surface.
5. Introduce a standalone showcase page for curated example projects.
6. Align monetization wording so code generation is the primary paid trigger.

## Out of scope

1. Removing legacy preview-build/runtime-preview backend routes in this turn.
2. Filling showcase with final real demo projects in this turn.
3. Reworking admin platform-config screens in this turn.
