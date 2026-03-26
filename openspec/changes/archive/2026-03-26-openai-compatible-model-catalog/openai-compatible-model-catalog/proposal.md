# Proposal: OpenAI-Compatible Model Catalog (P0)

## Why

Current admin model management only supports switching built-in models.

Operators need to connect new domestic model providers quickly without code edits, as long as the provider supports OpenAI-compatible API.

## Scope

1. Add custom model list management in `/admin/models`
2. Store custom model configs in `SystemConfig` (encrypted API key)
3. Include enabled custom models in model selection options
4. Resolve runtime model by model catalog (built-in + custom)
5. Use model catalog pricing for token cost accounting

