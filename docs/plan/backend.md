# Backend Plan and TODO (PocketBudget)

Last updated: 2026-02-06

## 1) Purpose

This document defines all backend work for `basic-budget`, scoped for parallel execution with a separate frontend agent.

Backend here means:
- local data layer (SQLite + migrations + repositories)
- domain logic (budget math, period logic, rollovers, alerts)
- service implementations matching `src/types/services.ts`
- import/export and optional sync/bank integration backend
- testing, reliability, security, and release readiness for backend code

Frontend can proceed concurrently against the contracts in:
- `src/types/domain.ts`
- `src/types/services.ts`
- `src/types/store.ts`

## 2) Ownership Boundaries (Backend vs Frontend)

Backend owns:
- DB schema and migrations
- repository implementations
- domain calculations and rules
- service implementations and error handling
- data import/export, dedupe, reconciliation logic
- alert evaluation logic
- optional cloud/bank integration services and APIs
- backend-focused tests and CI gates

Frontend owns:
- navigation/screens/components
- chart rendering and interactions
- form UX and validation messaging
- app theming/design tokens
- store wiring to service calls (using backend implementations)

Shared contract:
- `src/types/*` is the API boundary
- contract changes require explicit coordination

## 3) Locked Decisions

These are fixed unless explicitly changed:
- Local-first architecture for MVP
- Storage: SQLite (`expo-sqlite`)
- Data access style: raw SQL repositories (no ORM for MVP)
- Weekly cadence model: overlapping week windows (Approach A)
- Left-to-spend: strict daily/weekly allowance
- Planned income stored on period
- Pending imported transactions excluded from core budget totals by default
- Category default grouping: `need` / `want`

## 4) Target Backend Structure

```text
src/
  backend/
    db/
      client.ts
      migrations/
        0001_init.sql
        0002_alerts.sql
        0003_import_meta.sql
      migrate.ts
      schema.md
    repos/
      periodsRepo.ts
      categoriesRepo.ts
      budgetsRepo.ts
      transactionsRepo.ts
      settingsRepo.ts
      alertsRepo.ts
      importBatchesRepo.ts
    domain/
      money.ts
      dates.ts
      periods.ts
      budgets.ts
      leftToSpend.ts
      pace.ts
      rollover.ts
      alerts.ts
      reconciliation.ts
    services/
      periodService.ts
      categoryService.ts
      budgetService.ts
      transactionService.ts
      calculationService.ts
      settingsService.ts
      alertService.ts
      csvService.ts
      index.ts
    sync/                    # optional phase
      queue.ts
      engine.ts
      conflict.ts
    bank/                    # optional phase
      apiClient.ts
      tokenExchange.ts
      webhookHandler.ts
    infra/
      clock.ts
      uuid.ts
      logger.ts
      errors.ts
```

## 5) Workstreams and TODO

Status legend:
- `[ ]` not started
- `[-]` in progress
- `[x]` complete

### WS-0: Backend Foundation

- [ ] BE-001 Create backend folder structure under `src/backend`.
- [ ] BE-002 Add backend barrel exports (`src/backend/services/index.ts`).
- [ ] BE-003 Add backend error taxonomy:
  - `NotFoundError`
  - `ValidationError`
  - `ConflictError`
  - `PersistenceError`
  - `ImportError`
- [ ] BE-004 Add deterministic infrastructure helpers:
  - clock abstraction (`now`, `todayLocal`)
  - UUID provider
  - typed logger interface
- [ ] BE-005 Add backend README with module boundaries and import rules.

Done when:
- backend modules compile independently
- all services can be imported by frontend store without circular deps

### WS-1: SQLite and Migrations

- [ ] BE-010 Implement DB client initialization for Expo SQLite.
- [ ] BE-011 Implement migration runner with ordered SQL migration files.
- [ ] BE-012 Create migration `0001_init.sql` for:
  - `periods`
  - `categories`
  - `budgets`
  - `transactions`
  - `settings`
- [ ] BE-013 Add constraints and indexes from `docs/technical/Data_Model.md`.
- [ ] BE-014 Add migration metadata table (version, applied_at).
- [ ] BE-015 Add migration test harness:
  - fresh install path
  - upgrade path
  - idempotency checks
- [ ] BE-016 Add rollback strategy doc for bad migration recovery in dev.

Done when:
- app can bootstrap DB from zero state
- schema matches type contracts and documented indexes

### WS-2: Repository Layer

- [ ] BE-020 Implement `PeriodsRepo` CRUD/list/current-period lookup.
- [ ] BE-021 Implement `CategoriesRepo` create/update/archive/list.
- [ ] BE-022 Implement `BudgetsRepo` upsert + unique `(period_id, category_id)`.
- [ ] BE-023 Implement `TransactionsRepo` create/update/soft-delete/list/filter.
- [ ] BE-024 Implement `SettingsRepo` singleton read/update with defaults.
- [ ] BE-025 Implement `AlertsRepo` store/list/dismiss + rule upsert.
- [ ] BE-026 Implement `ImportBatchesRepo` and idempotency tracking (MVP+).
- [ ] BE-027 Add repository integration tests with seeded fixture DB.
- [ ] BE-028 Add SQL query performance checks for:
  - period totals
  - per-category totals
  - weekly aggregates

Done when:
- repositories satisfy expected invariants
- repository tests pass on clean DB each run

### WS-3: Core Domain Math and Rules

- [ ] BE-030 Implement money utilities:
  - cent-safe arithmetic
  - rounding and clamp helpers
  - signed amount helpers
- [ ] BE-031 Implement date/period utilities:
  - monthly period boundaries
  - biweekly period generation from anchor
  - week boundaries from `weekStart`
  - day count and overlap helpers
- [ ] BE-032 Implement weekly cadence expansion (overlapping week windows).
- [ ] BE-033 Implement `remaining_period` computation.
- [ ] BE-034 Implement `left_today` and `left_this_week` computation.
- [ ] BE-035 Implement overspend behavior and clamping rules.
- [ ] BE-036 Implement pace status (`on_track|warning|overspent`) rules.
- [ ] BE-037 Implement rollover engine:
  - `reset`
  - `pos`
  - `pos_neg`
- [ ] BE-038 Add domain unit tests for:
  - 28/29/30/31 day months
  - biweekly edges
  - partial-week overlaps
  - timezone boundary cases
  - negative carryover propagation

Done when:
- calculation outputs are deterministic and tested across date edge cases

### WS-4: Service Implementations (Contract Layer)

- [ ] BE-040 Implement `PeriodService` against repos + domain utils.
- [ ] BE-041 Implement `CategoryService`.
- [ ] BE-042 Implement `BudgetService`:
  - upsert budget
  - period summary
  - category summary
  - apply rollovers
- [ ] BE-043 Implement `TransactionService`.
- [ ] BE-044 Implement `CalculationService`.
- [ ] BE-045 Implement `SettingsService`.
- [ ] BE-046 Implement `AlertService`.
- [ ] BE-047 Implement `CSVService` export and import flows.
- [ ] BE-048 Add service-level validation aligned to type contracts.
- [ ] BE-049 Add service integration tests using a real SQLite test DB.

Done when:
- every interface in `src/types/services.ts` has a concrete implementation
- service tests prove behavior on realistic fixtures

### WS-5: Summary Builders and Read Models

- [ ] BE-050 Implement summary builders for `BudgetSummary` and `CategorySummary`.
- [ ] BE-051 Add aggregate query helpers:
  - total spent in period
  - spent by category
  - spent in week bucket
- [ ] BE-052 Add cache/invalidation policy for summary recomputation.
- [ ] BE-053 Add deterministic fixture snapshots for dashboard-level data.

Done when:
- frontend can request summaries without recomputing core math client-side

### WS-6: CSV Import/Export and Reconciliation

- [ ] BE-060 Implement CSV export: transactions.
- [ ] BE-061 Implement CSV export: budget snapshot.
- [ ] BE-062 Implement CSV parser with robust column mapping.
- [ ] BE-063 Implement import validation:
  - invalid date
  - invalid amount
  - missing category mapping behavior
- [ ] BE-064 Implement duplicate detection:
  - exact by `externalId` when present
  - fallback fuzzy key `(date, amount, merchant)`
- [ ] BE-065 Implement import result reporting (`imported`, duplicates, errors).
- [ ] BE-066 Add import test matrix and fixture CSV files.

Done when:
- CSV flows are reliable and deterministic across repeated imports

### WS-7: Alert Engine (MVP Local Alerts)

- [ ] BE-070 Implement alert rule persistence per category.
- [ ] BE-071 Implement approaching-limit evaluation logic.
- [ ] BE-072 Implement overspent evaluation logic.
- [ ] BE-073 Implement dedupe for repeated alerts in same period state.
- [ ] BE-074 Implement alert dismissal behavior.
- [ ] BE-075 Add local notification payload builder hooks (no UI).
- [ ] BE-076 Add alert engine tests with threshold edge cases.

Done when:
- alert evaluation is deterministic and does not spam duplicates

### WS-8: Security and Privacy (Backend Responsibilities)

- [ ] BE-080 Implement secure abstraction for sensitive values (if introduced).
- [ ] BE-081 Ensure no sensitive payload logging in backend code paths.
- [ ] BE-082 Add privacy-safe audit logs for import/sync errors.
- [ ] BE-083 Add data deletion helpers for local user reset flows.
- [ ] BE-084 Add documentation for data handling and retention.

Done when:
- backend code follows `docs/technical/Security_Privacy.md` constraints

### WS-9: Optional Cloud Sync (Post-MVP)

- [ ] BE-090 Define sync schema requirements (`updated_at`, `deleted_at`, cursors).
- [ ] BE-091 Implement local outbound change queue.
- [ ] BE-092 Implement inbound apply/upsert+tombstone processor.
- [ ] BE-093 Implement sync engine:
  - pull remote changes since cursor
  - upload local changes since cursor
  - cursor update
- [ ] BE-094 Implement conflict policy (last-write-wins for MVP sync).
- [ ] BE-095 Add sync state/error mapping for store consumption.
- [ ] BE-096 Add offline/online replay tests.

Done when:
- multi-device sync works with recoverable failure handling

### WS-10: Optional Bank Integration Backend (Post-MVP)

- [ ] BE-100 Define provider adapter interface (Plaid-style).
- [ ] BE-101 Implement `POST /bank/link-token`.
- [ ] BE-102 Implement `POST /bank/exchange-token`.
- [ ] BE-103 Implement `GET /bank/accounts`.
- [ ] BE-104 Implement `POST /bank/transactions/pull`.
- [ ] BE-105 Implement webhook endpoint with signature validation.
- [ ] BE-106 Implement encrypted token storage and key management.
- [ ] BE-107 Implement transaction normalization and mapping to local schema.
- [ ] BE-108 Implement pending-to-posted transition handling.
- [ ] BE-109 Add integration tests with mocked provider payloads.

Done when:
- provider tokens never touch client storage
- imports are idempotent and reconciled safely

### WS-11: Reliability, QA, and CI Gates

- [ ] BE-110 Add unit test coverage thresholds for domain math modules.
- [ ] BE-111 Add integration tests for repositories and services.
- [ ] BE-112 Add regression suite for period transition and rollover.
- [ ] BE-113 Add property-like tests for money/date invariant checks.
- [ ] BE-114 Add benchmark or guardrail tests for large transaction sets.
- [ ] BE-115 Wire CI jobs:
  - lint
  - typecheck
  - unit tests
  - integration tests
- [ ] BE-116 Add release checklist for backend readiness.

Done when:
- CI enforces backend correctness before merge

## 6) Critical Path (MVP Backend)

Order of execution:
1. WS-0 foundation
2. WS-1 migrations
3. WS-2 repositories
4. WS-3 domain math
5. WS-4 services
6. WS-5 summaries
7. WS-6 CSV
8. WS-7 alerts
9. WS-11 hardening

## 7) Parallelization With Frontend Agent

Backend can proceed independently while frontend builds screens/stores:
- Frontend uses `src/types/services.ts` interfaces and mock service implementations.
- Backend implements real services under `src/backend/services/*`.
- Integration point: a service factory that swaps mock vs real implementations.

Concurrency rules:
- Do not change field names or union literals in `src/types/*` without explicit coordination.
- If contract changes are required, open a small dedicated contract PR first.
- Backend returns stable null/empty defaults where possible to avoid frontend blocking.

## 8) Integration Contracts to Freeze Early

Freeze first:
- `LeftToSpend`
- `CategorySummary`
- `BudgetSummary`
- `TransactionFilter`
- CSV import result shape

These are high-impact for frontend selectors and screen rendering.

## 9) Definition of Done (MVP Backend)

MVP backend is done when all are true:
- all core service interfaces are implemented and wired
- calculations pass documented edge-case tests
- period rollover works across month/pay-period boundaries
- CSV export/import works with dedupe
- alert evaluation works without duplicate spam
- migrations are stable from clean install
- CI gates pass consistently
- frontend can run entirely on real backend implementations without mock fallbacks

## 10) Suggested Backend Commit Slices (Target: 24-30 commits)

Suggested slices:
1. backend scaffolding + error primitives
2. sqlite client + migration runner
3. schema v1 migration
4. repository: periods/categories
5. repository: budgets/transactions
6. repository: settings/alerts
7. domain money/date helpers
8. period boundary logic
9. weekly overlap expansion logic
10. left-to-spend engine
11. pace and overspend logic
12. rollover engine
13. `PeriodService`
14. `CategoryService`
15. `TransactionService`
16. `BudgetService` summaries
17. `CalculationService`
18. `SettingsService`
19. `AlertService`
20. CSV export service
21. CSV import + dedupe
22. service integration tests
23. regression tests for edge dates/rollovers
24. CI gate wiring
25. backend docs + integration notes
26. optional performance/query optimization pass

## 11) Open Decisions To Track

- Whether to include positive income transactions in MVP UI flow or keep period-only income input.
- Whether alerts should evaluate only on write events or also on scheduled background checks.
- CSV import schema strictness vs flexible header aliases.
- Exact warning threshold default (`80%` suggested).
- Sync/bank timelines relative to MVP launch scope.

