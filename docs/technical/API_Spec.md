# API Specification

This document covers **(A)** the in-app module interfaces and **(B)** optional backend endpoints for bank sync.

## A) In-app “domain service” interfaces (TypeScript)

### Budget period service
- `getCurrentPeriod(): Period`
- `createNextPeriod(params): Period`
- `listPeriods(): Period[]`

### Budget service
- `upsertCategoryBudget(periodId, categoryId, cadence, amountCents, rolloverRule)`
- `getBudgetSummary(periodId): BudgetSummary`
- `getCategorySummary(periodId, categoryId): CategorySummary`

### Transaction service
- `addTransaction(input): Transaction`
- `updateTransaction(id, patch): Transaction`
- `deleteTransaction(id): void`
- `listTransactions(filter): Transaction[]`

### Calculation service
- `computeLeftToSpendToday(periodId, categoryId, dateISO): MoneyCents`
- `computeLeftToSpendThisWeek(periodId, categoryId, dateISO, weekStart): MoneyCents`
- `computeOnPaceStatus(periodId, categoryId, dateISO): "on_track"|"warning"|"overspent"`

## B) Optional backend endpoints (Bank sync)

> Note: a backend is required for secure token exchange with most bank providers.

### Auth
You can keep it simple:
- If app is local-only, backend can use **anonymous** device identifiers (not ideal)
- If sync is enabled, use proper user auth (Supabase Auth / Firebase Auth)

### 1) Create link token (client -> backend)
`POST /bank/link-token`

Request:
```json
{
  "userId": "uuid",
  "platform": "ios|android"
}
```

Response:
```json
{
  "linkToken": "string",
  "expiresAt": "2026-02-03T12:00:00Z"
}
```

### 2) Exchange public token (client -> backend)
`POST /bank/exchange-token`

Request:
```json
{
  "userId": "uuid",
  "publicToken": "string"
}
```

Response:
```json
{
  "ok": true
}
```

### 3) List accounts (client -> backend)
`GET /bank/accounts?userId=uuid`

Response:
```json
{
  "accounts": [
    {
      "id": "acct_123",
      "name": "Chase Sapphire",
      "mask": "1234",
      "type": "credit",
      "currency": "USD"
    }
  ]
}
```

### 4) Pull transactions (client -> backend)
`POST /bank/transactions/pull`

Request:
```json
{
  "userId": "uuid",
  "startDate": "2026-01-01",
  "endDate": "2026-02-03"
}
```

Response:
```json
{
  "transactions": [
    {
      "externalId": "tx_abc",
      "date": "2026-02-01",
      "name": "STARBUCKS",
      "amountCents": -595,
      "currency": "USD",
      "accountId": "acct_123",
      "status": "posted",
      "merchant": "Starbucks",
      "categoryHint": "Coffee"
    }
  ]
}
```

### 5) Webhook (provider -> backend)
`POST /bank/webhook`

- Validates webhook signature
- Triggers incremental fetch + emits a “sync available” signal to the app (push notification optional)

## Security notes (non-negotiable if bank sync)
- Provider access tokens must **never** be stored in the mobile app
- Store tokens encrypted at rest on the backend
- Use least-privilege scopes
- Log minimal data, redact sensitive payloads
