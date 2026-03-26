# Specs

## Requirement: Workspace delete must be persistent

### Scenario: delete an expired workspace
- Given a user has an expired workspace in workspace list
- When user confirms deletion
- Then API deletes workspace record from database
- And refresh will not show this workspace again.

### Scenario: admin delete permission
- Given admin deletes a workspace
- When workspace exists
- Then API allows deletion even if admin is not workspace owner.

### Scenario: storage cleanup
- Given workspace has generated files
- When deletion executes
- Then storage deletion is attempted for each file key
- And DB deletion still proceeds if storage cleanup partially fails.
