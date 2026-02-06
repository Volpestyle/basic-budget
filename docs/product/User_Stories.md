# User Stories & Acceptance Criteria

## Epic 1: Budget setup

### US-1.1 Choose budget cycle
**As a user**, I want to choose whether I budget by calendar month or by biweekly pay periods, **so that** the app matches how I get paid.

**Acceptance criteria**
- Given first launch, user can select `Monthly` or `Biweekly`
- If `Biweekly`, user can set:
  - payday anchor date (e.g., last payday)
  - pay frequency fixed at 14 days
- App generates “current period start/end” from selection

### US-1.2 Create categories
**As a user**, I want to create budget categories with icons and colors, **so that** I can personalize the app.

**Acceptance criteria**
- Create, edit, archive categories
- Category has name, icon, color, type (Need/Want), default cadence

### US-1.3 Allocate budgets
**As a user**, I want to allocate amounts to each category, **so that** my plan reflects my priorities.

**Acceptance criteria**
- Allocation can be:
  - Monthly amount
  - Weekly amount
- App validates total allocated ≤ income (or allows oversubscription with warning)

## Epic 2: Transactions

### US-2.1 Quick add transaction
**As a user**, I want a quick way to add a transaction, **so that** tracking isn't painful.

**Acceptance criteria**
- One-screen “Add” with amount, category, date (default today), merchant note (optional)
- Immediate update of remaining/left-to-spend numbers

### US-2.2 Import transactions (optional)
**As a user**, I want to import transactions from my bank, **so that** spending is tracked automatically.

**Acceptance criteria**
- User can link an account (optional)
- Imported transactions show “pending/posted” status
- Duplicate handling is present (same provider id or fuzzy match)

## Epic 3: Left-to-spend views

### US-3.1 Category left today
**As a user**, I want to see how much I can spend today in a category, **so that** I can decide quickly.

**Acceptance criteria**
- Category screen shows:
  - budget, spent, remaining
  - left today
- Left today uses:
  - remaining / days remaining (configurable rounding)
- If overspent, left today = 0 and overspent shown

### US-3.2 Category left this week
**As a user**, I want to see what I can spend this week for groceries, **so that** I don't run out early.

**Acceptance criteria**
- Weekly view respects user’s “week start” setting
- `spent_in_week` computed from transaction dates
- Remaining this week = weekly budget - spent_in_week

## Epic 4: Visualization & insights

### US-4.1 Monthly dashboard
**As a user**, I want charts that show spending vs budget and remaining by category, **so that** I understand my month at a glance.

**Acceptance criteria**
- Monthly chart view with at least:
  - category breakdown chart
  - spent vs budget
- Toggle between months

### US-4.2 Category burn-down
**As a user**, I want a chart that shows if I'm “on pace,” **so that** I can adjust early.

**Acceptance criteria**
- Burn-down line shows remaining over time
- Optional “ideal pace” line based on distribution rule

## Epic 5: Period rollover

### US-5.1 Rollover rules
**As a user**, I want to choose whether leftover funds roll into next period, **so that** the app matches my style.

**Acceptance criteria**
- Per category:
  - reset
  - rollover positive
  - rollover positive & negative
- Rollover applied when new period created
