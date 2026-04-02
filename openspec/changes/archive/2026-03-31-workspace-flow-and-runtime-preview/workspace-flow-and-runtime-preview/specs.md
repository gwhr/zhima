# Specs: Workspace Flow and Runtime Preview

## Functional requirements

1. Topic recommendation must accept current major category and selected tech stack context.
2. Recommended topics should display stack tags that are coherent with downstream generation path.
3. Workspace operation panel must show actionable waiting/progress messages while dependent steps are blocked.
4. AI chat panel must provide a user-visible stop action for in-progress response.
5. Generated project artifact preview should better represent runnable scaffold structure for target stack.
6. Runtime preview entry should be queued with visible status and session limit.
7. Runtime preview session should auto-expire by configured duration and release slot.
8. Trusted device login should reduce repeated SMS login operations within configured period.

## Non-functional requirements

1. Queue/session updates should be observable in UI state.
2. Runtime preview restrictions must avoid unbounded resource occupation.
3. UX copy should reduce "卡住" ambiguity and reflect actual processing stages.

