# Design: Admin Model Management

## Storage

Reuse `SystemConfig` with key `platform:model-provider-config`.

Stored fields:

1. encrypted key overrides: `anthropicApiKeyEnc`, `deepseekApiKeyEnc`, `zhipuApiKeyEnc`
2. optional base URL overrides: `deepseekBaseUrl`, `zhipuBaseUrl`

## Security

1. Keys are encrypted with AES-256-GCM before storage.
2. Encryption seed priority:
   - `CONFIG_ENCRYPTION_SECRET`
   - `NEXTAUTH_SECRET`
   - `AUTH_SECRET`
3. Admin GET response only returns masked values and source flag.

## Runtime resolution

`getRuntimeModel(modelId)` resolves provider credentials in order:

1. admin override
2. environment variable
3. empty

This runtime resolver is used in:

1. worker code/thesis generation
2. requirement expansion/recommendation APIs
3. requirement confirmation/re-evaluation API
4. AI router model selection
