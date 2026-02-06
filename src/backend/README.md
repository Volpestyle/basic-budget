# Backend Module Guide

Backend code lives in `src/backend` and should not import UI modules.

## Layering

1. `db/`: SQLite adapter + migrations
2. `repos/`: SQL CRUD/query access
3. `domain/`: pure calculations/rules
4. `services/`: contract implementations from `src/types/services.ts`
5. `infra/`: clock/uuid/logger/errors

## Rules

- Keep business logic out of repositories.
- Keep services thin: orchestration + validation + composition.
- Use `src/types/*` as stable contract boundaries with frontend.
- Avoid logging sensitive payload fields.
