# Specs: Admin Model Connectivity Test

## Functional requirements

1. Admin can test built-in model connectivity from model page without leaving page.
2. Admin can test custom model connectivity for each custom model row.
3. Test can use unsaved form values (key/url/modelName) to validate config before save.
4. API must return clear error messages for invalid URL, missing key, and provider-side failures.

## Non-functional requirements

1. Test endpoint must be admin-protected.
2. API must not expose plaintext saved keys in responses.
3. Test call should keep output short to control cost and latency.

