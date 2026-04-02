# Specs: Token Recharge Plan Config and Publish Control

## Functional requirements

1. Platform config must persist recharge plan fields:
   - `id` (`BASIC|STANDARD|PREMIUM`)
   - `name`
   - `priceYuan`
   - `points`
   - `description`
   - `published`
2. Admin platform settings page must support editing these fields and saving in one request.
3. User billing plan listing endpoint must return published plans only.
4. Payment order creation must reject unpublished plan IDs.
5. Payment callback settlement must use runtime configured plan points (including unpublished historical plans for existing orders).

## Non-functional requirements

1. Existing enum-based order schema remains compatible (no migration required).
2. Plan value validation must prevent empty names and non-positive price/points.
3. Fallback defaults must keep service available when config is absent or partial.

