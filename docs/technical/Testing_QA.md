# Testing & QA Plan

## Unit tests (highest value)
Focus on calculation correctness.

### Budget calculation cases
- Monthly period with 28/29/30/31 days
- Biweekly period boundary and “next period” generation
- Weekly cadence category across partial weeks
- Overspend: remaining < 0
- Rollover rules:
  - reset
  - positive only
  - positive & negative
- Timezone/day boundary: transaction at 23:59 local time

### Transaction import cases (optional)
- Duplicate detection by external_id
- Pending → posted transition updates correctly
- Category mapping rules applied

## Integration tests
- SQLite repository CRUD correctness
- Upsert budgets for a period (unique constraint)
- Aggregate queries produce expected values

## UI tests
- Navigation and key flows:
  - Onboarding → dashboard
  - Add transaction
  - Category detail left-to-spend updates
- Accessibility checks:
  - screen reader labels
  - dynamic type sizing

## End-to-end
- Detox (React Native) or Maestro
- Scenarios:
  - setup + add transactions + month review
  - offline mode + reopen app + data persists

## Regression checklist (manual)
- Period change (end of month) does not break remaining calculations
- Charts render with large transaction counts
- Backup/export works
