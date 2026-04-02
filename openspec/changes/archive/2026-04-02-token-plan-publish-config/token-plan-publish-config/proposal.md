# Proposal: Editable and Publishable Token Recharge Plans

## Why

Token recharge pricing is currently managed by the platform and needs fast iteration.

To support运营调价 and阶段性上架/下架, admin must be able to:

1. edit plan pricing and points mapping
2. publish/unpublish plans without code changes
3. ensure user checkout only uses published plans

## Scope

1. Extend platform config with structured recharge plan data for `BASIC/STANDARD/PREMIUM`.
2. Add admin UI controls to edit plan name/price/points/description/published flag.
3. Make billing plans API return only published plans.
4. Make payment create/notify settle by runtime configured plans.

## Out of scope

1. introducing arbitrary unlimited custom plan IDs
2. third-party payment channel feature changes
3. token billing formula redesign

