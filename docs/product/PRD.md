# Product Requirements Document (PRD)

## 1) Overview

### Product name (working)
**PocketBudget** (placeholder)

### One‑sentence summary
A month‑centric budgeting app that helps people allocate income into categories (“envelopes”), track spending automatically or manually, and see **what’s left to spend today / this week / this month** with clear visualizations.

### Problem statement
Most budgeting tools either:
- require heavy bookkeeping, or
- show spending after the fact with little guidance for day-to-day decisions.

Users want a simple budget they can set at the start of a month (or pay period) and then quickly answer:
- *“Can I buy this today?”*
- *“How much do I have left for food this week?”*
- *“Am I on track for the month?”*

### Primary goals
1. Make budgeting setup **fast** (≤5 minutes for a workable first budget).
2. Make daily decisions easy via **left-to-spend** views.
3. Make progress & patterns obvious with **rich charts** and month-by-month comparisons.
4. Support both **monthly** and **biweekly** income schedules.

### Non‑goals (initially)
- Investment tracking
- Tax preparation
- Advanced forecasting with complicated models
- Full accounting / business bookkeeping

## 2) Target users & jobs-to-be-done

### Primary user segments
- **New budgeters**: want guidance, low friction.
- **Routine budgeters**: want recurring budgets and quick check-ins.
- **Income cycle budgeters**: paid biweekly and prefer budgeting by pay period.

### Jobs-to-be-done
- “I want to know whether I can spend on X without stressing.”
- “I want to avoid overspending categories before the month ends.”
- “I want to see if I'm improving month-over-month.”

## 3) Core features (MVP)

### A) Budget setup (month / pay period)
- Choose budgeting cycle:
  - **Calendar month** (e.g., Feb 1–Feb 28)
  - **Biweekly pay period** (user sets payday anchor date)
- Enter income:
  - monthly total (or biweekly amount)
  - optionally multiple income sources
- Create categories (examples):
  - Necessities: rent, utilities, groceries, transportation, debt payments
  - Lifestyle: dining out, subscriptions, entertainment, shopping, hobbies
- Set a target allocation per category (amount + cadence):
  - Monthly (default)
  - Weekly (e.g., groceries)
  - Custom (e.g., “2x per month”, or “weekends only” later)

### B) Transaction capture
- Manual entry (fast-add)
- Optional import:
  - CSV import (MVP+)
  - Bank integration (optional; see section 8)

### C) Daily & weekly “Left to spend”
- Category detail shows:
  - budgeted amount
  - spent so far
  - remaining for period
  - **left today** and **left this week** (based on distribution rules)
- Global dashboard tiles:
  - total left for month / pay period
  - top categories remaining / overspent
  - “safe to spend” indicator (configurable)

### D) Visualizations
- Monthly overview:
  - donut / stacked bars by category
  - spending vs budget trend line
- Category view:
  - burn-down chart (remaining vs days)
  - weekly bars

### E) Customization & quality-of-life
- Category icons/colors (theme)
- Rollover rules per category:
  - no rollover (reset monthly)
  - rollover positive only
  - rollover positive & negative
- Alerts:
  - approaching limit
  - overspent

## 4) Key user flows

### Flow 1: First-time setup
1. Select cycle (Monthly or Biweekly)
2. Enter income
3. Choose template categories (optional) or build from scratch
4. Set budget allocations (suggestions shown)
5. Land on “This Period Dashboard”

### Flow 2: Check “Can I spend this?”
1. Open app
2. Search/select category (or merchant map)
3. See “Left today” + “Left this week” + “Remaining this period”
4. Optionally log transaction

### Flow 3: End-of-period review
1. Open month summary
2. Identify overspent categories
3. Adjust next period budgets (copy & tweak)

## 5) Budgeting model (definition)

### Entities (conceptual)
- **Period**: month or pay period
- **Category**: envelope (e.g., Groceries)
- **Budget target**: planned allocation per category per period (or per week)
- **Transactions**: spending or income events
- **Distribution rule**: how to compute left-to-spend today/week

### Left-to-spend rules (recommended defaults)
- For monthly categories: distribute evenly over days remaining in period:
  - `left_today = max(0, remaining / days_remaining)` (or configurable)
- For weekly categories: weekly allowance anchored to user's “week start”:
  - `left_this_week = weekly_budget - spent_in_week`
  - `left_today` derived from days left in week
- Overspend handling:
  - If overspent, left-to-spend becomes 0 and status is “overspent”
  - If rollover allowed, negative remaining carries into next period

## 6) Success metrics

### Activation
- % completing budget setup
- time-to-first-budget
- # categories created

### Engagement
- daily opens / weekly active users
- # “left to spend” checks per week
- transactions captured per week (manual + imported)

### Outcome
- % months completed with ≤N overspent categories
- month-over-month reduction in overspend amount (cohort-based)

## 7) Monetization (optional)
- Freemium:
  - Free: manual tracking + basic charts
  - Paid: bank sync, advanced analytics, multiple budgets, export, widgets

## 8) Bank / credit integration (optional)
- Use a provider (e.g., Plaid-style) for:
  - account linking
  - transaction pull
  - merchant/category enrichment
- Requires a lightweight backend for:
  - token exchange
  - secure token storage
  - webhooks for updates

## 9) Risks & mitigations
- **Users abandon during setup** → templates, smart defaults, progressive setup
- **Bank sync complexity** → keep optional, start with manual + CSV
- **Privacy concerns** → clear permissioning, local-first, encryption, transparency

## 10) Out of scope (for MVP)
- Shared budgets between multiple users
- Complex debt payoff optimizer
- Investment/portfolio tracking
