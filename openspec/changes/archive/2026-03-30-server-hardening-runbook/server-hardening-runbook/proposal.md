# Proposal: Deployment Security Hardening Runbook

## Why

Production rollout required a repeatable and auditable hardening checklist for:

1. network ingress minimization
2. SSH access control tightening
3. rollback-safe execution steps

The team documented the runbook but had no corresponding openspec archive.

## Scope

1. Record hardening steps as an operational specification reference.
2. Define execution order and rollback notes for late-stage production cutover.
3. Keep this as operations guidance, not an application feature change.

