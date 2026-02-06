# Release Plan

## Phase 0: Prototype (1–2 weeks)
Goals:
- Prove left-to-spend computations and core flows
- Choose chart library & build 2–3 key charts

Deliverables:
- Expo app skeleton
- Local SQLite schema
- Dashboard + Category detail (static data)
- Basic charts

## Phase 1: MVP (6–10 weeks)
Must-haves:
- Onboarding + budget setup (monthly + biweekly)
- Categories CRUD
- Manual transactions
- Dashboard tiles (remaining + left today/week)
- Basic insights (month view, category breakdown)
- Offline-first persistence
- Basic export (CSV)

Outcomes:
- End-to-end budgeting cycle works without any external integrations

## Phase 2: Polish + Power Features (4–8 weeks)
- Templates (starter budgets)
- “On pace” / burn-down improvements
- Search & filters for transactions
- Rollover rules per category
- Alerts & notifications
- Home screen widgets (platform dependent)

## Phase 3: Bank integration (optional) (6–12 weeks)
- Provider selection (Plaid-style)
- Backend token exchange + secure storage
- Transaction import & reconciliation UI
- Duplicate detection and user corrections
- Webhooks and background refresh

## Phase 4: Multi-device sync (optional)
- Cloud sync (Supabase/Firebase/custom)
- Conflict resolution UX
- Backups, restore, multi-device testing
