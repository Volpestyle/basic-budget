# SQLite Schema (v1)

This schema is applied by migrations in `src/backend/db/migrations`.

Core tables:
- `periods`
- `categories`
- `budgets`
- `transactions`
- `settings`

MVP+ tables:
- `alert_rules`
- `alerts`
- `import_batches`

Migration source of truth:
- `0001_init.ts`
- `0002_alerts.ts`
- `0003_import_meta.ts`
