# Proposal: Admin Model Connectivity Test

## Why

Model failures are often caused by wrong key/base URL/model name configuration.

Operators need a direct way to verify connectivity before saving and running generation jobs.

## Scope

1. Add `POST /api/admin/models/test` for connectivity check
2. Add "测试连接" button for each built-in model section
3. Add "测试连接" button for each custom OpenAI-compatible model item
4. Return readable test status (success/failure, latency, short preview)

