# Design: OpenAI-Compatible Model Catalog (P0)

## Data model

- `SystemConfig` key: `platform:model-catalog`
- payload:
  - `customOpenAIModels[]`
    - `id` (unique)
    - `name`
    - `modelName`
    - `baseUrl`
    - `apiKeyEnc`
    - `inputCostPerMToken`
    - `outputCostPerMToken`
    - `enabled`

## Runtime resolution

1. For built-in model IDs (`opus/deepseek/glm`), use existing provider key config.
2. For custom model IDs, use OpenAI-compatible client with model-level `baseUrl + apiKey`.
3. If selected model is invalid, fallback to `deepseek` when available.

## Admin API changes

- `GET /api/admin/models` returns:
  - model options (built-in + enabled custom)
  - model option details (id/name/source)
  - provider key view
  - custom model admin view (masked key)
- `PATCH /api/admin/models` supports:
  - model selection updates
  - provider key updates
  - custom model list replacement/update

