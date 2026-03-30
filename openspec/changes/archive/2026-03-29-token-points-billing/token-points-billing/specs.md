# Specs: Token Points Billing

## Requirement 1: Reservation-First Billing

Each task start must reserve estimated points first.  
At task finish, system settles by real usage and returns difference when reserved > billed.

### Acceptance Criteria

1. When user starts code/thesis/chat task, a reservation record is created and points are frozen.
2. On successful completion, reservation moves to `SETTLED` and ledger writes `SETTLE`.
3. On failure/final abort, reservation moves to `RELEASED` and ledger writes refund/rollback.

## Requirement 2: Atomic Wallet Settlement

Wallet operations must run in DB transactions to avoid double deduction in concurrency.

### Acceptance Criteria

1. Freeze, settle, recharge, adjust, release are all transactional.
2. Concurrent deduction cannot make available points negative.
3. Settlement writes both wallet balances and ledger atomically.

## Requirement 3: Full Audit Ledger

Every billing change must be queryable with task/model/token/cost metadata.

### Acceptance Criteria

1. Ledger includes user, task, model, input/output/cache tokens, billed points, and timestamp.
2. Admin can query ledger by user and type.
3. User can query personal ledger history.

## Requirement 4: Risk-Control Gates

Platform must enforce insufficient-balance guard, daily cap, single-task cap, and concurrency cap.

### Acceptance Criteria

1. Task start fails with clear message if available points are insufficient.
2. Daily user spend limit blocks over-limit tasks.
3. Single-task token hard limit interrupts oversized jobs.
4. Concurrency limit blocks excessive parallel jobs.

## Requirement 5: Admin Operational Controls

Admin must be able to tune billing ratio and handle exceptional rollback.

### Acceptance Criteria

1. Admin can configure multiplier and point-rate in platform config.
2. Admin can view model price table including cache-hit pricing.
3. Admin can adjust user wallet total points.
4. Admin can rollback ACTIVE reservation from token-ledger page.
