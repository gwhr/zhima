# Design: Admin Model Connectivity Test

## API design

- Endpoint: `POST /api/admin/models/test`
- Auth: admin only
- Modes:
  - `kind: builtin`
    - model ids: `opus`, `deepseek`, `glm`
    - can pass temporary key/url override from current page state
  - `kind: custom`
    - test with provided `modelName + baseUrl + apiKey`
    - or fallback to saved custom model secret via `modelId`

## Test strategy

Use a short `generateText` request (`maxOutputTokens` small) as runtime ping.

Returned fields:

- `latencyMs`
- `preview` (first text)
- token usage summary

## UI behavior

1. Each model card has one "测试连接" button
2. During testing, only one active test runs at a time
3. Inline status is shown under the corresponding model card

