# Proposal: Token Points Billing

## Why

Current billing needs a single, model-agnostic charging unit that remains profitable across providers.  
The platform should charge users by platform points while internally settling by real model costs.

## Scope

1. Add wallet + reservation + ledger data model.
2. Apply reservation/settlement on code generation, thesis generation, and AI chat.
3. Replace user billing page with points balance, recharge, and ledger.
4. Add admin controls:
   - billing multiplier and point-rate config
   - model price table (input/output/cache)
   - user wallet adjustment
   - token ledger query and manual rollback for ACTIVE reservations
