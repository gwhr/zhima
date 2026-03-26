# Specs: OpenAI-Compatible Model Catalog (P0)

## Functional requirements

1. Admin can create/update/delete OpenAI-compatible custom models from UI.
2. Admin can set one custom model as code-generation model and another as thesis-generation model.
3. Custom model API keys must not be returned in plaintext in admin GET APIs.
4. Worker and chat runtime must load selected model via dynamic catalog resolution.
5. Usage logs must calculate cost with per-model pricing from catalog config.

## Validation

1. Custom model ID format: lowercase letters, digits, `-`, `_`, length 2-64.
2. Custom model ID must not conflict with built-in IDs.
3. `baseUrl` must be valid `http/https`.
4. New custom model requires an API key.

