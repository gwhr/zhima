# Specs: Admin Model Management

## Functional requirements

1. Admin MUST be able to select code-generation model and thesis-generation model from backend UI.
2. Admin MUST be able to update provider API keys from backend UI.
3. System MUST persist key overrides securely (encrypted at rest).
4. Runtime model invocation MUST use admin key overrides when present.
5. Runtime model invocation MUST fall back to environment variables when no override exists.
6. Backend MUST never return full API keys in read APIs.
