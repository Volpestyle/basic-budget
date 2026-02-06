# Open Questions

## Budget model decisions
1. For weekly cadence categories, should total monthly allocation vary by month (weeks-overlapping approach) or use 52/12 conversion?
2. Should “left to spend today” be:
   - a strict daily allowance (remaining/days remaining), or
   - a “safe to spend” number that can be larger (e.g., based on predicted bills)?

## Income handling
3. Do we model income transactions explicitly, or only store planned income on the period?
4. Should the app handle multiple paychecks per month automatically (3-paycheck months) with an “extra paycheck rule”?

## Bank integration scope
5. Which provider (Plaid-style vs others)? Which countries?
6. Do we support pending transactions and how do we represent them in totals?

## UX
7. Should categories be grouped as Needs/Wants by default, or user-defined groups?
8. Do we include bill reminders and due dates in MVP?

## Data export
9. Which export formats: CSV only, or also JSON?
