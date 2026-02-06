# Data Visualization Plan

## Principles
- Start with the minimum set of charts that answer key questions:
  1) “Where is my money going?”
  2) “Am I on track this period?”
  3) “What changed vs last month?”

## Recommended charts (MVP)

### 1) Category breakdown (Donut)
Data:
- spent per category (or remaining per category toggle)
Notes:
- Keep legend tappable; tap highlights category

### 2) Spending vs Budget (Cumulative line)
Data:
- x: day index in period
- y: cumulative spend
- optional: budget pace line (ideal)

### 3) Category burn-down
Data:
- x: day
- y: remaining balance
- show threshold lines (0, warning)

### 4) Weekly bars (for weekly cadence categories)
Data:
- buckets by week in period
- bar height = spent

## Libraries
- Victory Native: good defaults, stable
- Custom `react-native-svg` for tailored interactions
- Consider performance:
  - pre-aggregate in SQLite
  - memoize chart series data

## Accessibility
- Provide text equivalents for charts:
  - “You spent $X of $Y in Groceries (Z% of budget).”
- Avoid relying solely on color:
  - status icons + labels (“On track”, “Warning”, “Overspent”)
