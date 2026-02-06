# React Native + Expo Setup Notes

## Project initialization
- Create app:
  - `npx create-expo-app budget-app --template`
- Use TypeScript template

## Suggested folder structure
```
src/
  app/                # navigation, app shell
  screens/            # screen components
  components/         # reusable UI components
  domain/             # business logic (periods, budgets, calculations)
  data/
    db/               # sqlite init + migrations
    repos/            # repositories (SQL queries)
  state/              # zustand/redux store slices
  charts/             # chart builders
  utils/
  types/
```

## Database
- `expo-sqlite` for local persistence
- Add a migration system:
  - version table + migration scripts
  - run migrations on app start

## Performance tips
- Avoid re-rendering chart components:
  - memoize series data
- Use pagination/virtualized lists for transactions
- Precompute summaries per period when possible
