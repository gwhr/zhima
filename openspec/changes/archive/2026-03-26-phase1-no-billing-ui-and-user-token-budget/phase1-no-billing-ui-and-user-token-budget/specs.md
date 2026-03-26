# Specs

## Requirement 1: Hide Billing UI in Phase-1

### Scenario: user enters dashboard navigation
- Given a logged-in normal user
- When they browse dashboard navigation and quick actions
- Then they should not see billing/plan purchase entries.

### Scenario: user enters profile menu
- Given a logged-in normal user
- When they open profile dropdown
- Then they should not see `套餐管理` entry.

### Scenario: marketing landing page
- Given a visitor opens the landing page
- When they scroll through sections
- Then they should not see direct paid package pricing block for phase-1.

## Requirement 2: Per-user token budget override

### Scenario: admin sets user token budget override
- Given an admin on user management page
- When admin sets a positive integer token budget for a user
- Then the value is persisted as the user's override.

### Scenario: admin clears user token budget override
- Given a user has a token budget override
- When admin clears the value
- Then user falls back to platform default token budget.

### Scenario: quota check uses effective budget
- Given a user may have token budget override
- When system checks token quota for chat/code/thesis operations
- Then it uses override value first, otherwise platform default.

### Scenario: token summary display
- Given admin/user token summary endpoints are called
- When response is built
- Then tokenBudget/tokenRemaining are calculated from effective budget.
