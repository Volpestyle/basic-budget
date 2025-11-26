# Basic Budget — Design Specification

> A monthly budgeting app that makes it effortless to manage your finances.

---

## 1. Product Scope

### Goal

A monthly budgeting app that makes it effortless to:

- Log income streams and individual purchases
- Track recurring payments (income + expenses)
- See category-based breakdowns
- Visualize spending and income in multiple ways
- Use seamlessly on web + mobile (PWA)

### Primary Personas

- Solo user with multiple income streams (salary + freelance)
- Wants quick capture on mobile, deeper analysis on desktop
- Likes geeky, data-rich dashboards but clean aesthetics

---

## 2. High-Level Features

### 2.1 Authentication

- Sign in with Google (no email/password)
- Basic profile: name, avatar, primary currency, locale

### 2.2 Income Streams

- Define streams (e.g., "ACME Salary", "Freelance", "Rental")
- Planned amount / period (monthly, bi-weekly, one-off)
- Actual income transactions linked to streams

### 2.3 Transactions

- Add expense / income / transfer
- Fields: date, amount, category, description, tags, merchant
- Search + filter (by category, date range, stream, tags)

### 2.4 Recurring Payments

- Recurring expenses (rent, subscriptions, utilities)
- Recurring incomes (salary, retainers)
- Recurrence rules: monthly, weekly, bi-weekly, custom day-of-month
- Auto-generated transactions with ability to skip/override

### 2.5 Budgets & Categories

- Custom categories (Food, Rent, Tools, etc.)
- Monthly budget for each category
- Ability to archive categories
- Color & icon per category

### 2.6 Visualizations

- Category breakdown donut for current month
- Income vs expenses bar/line chart per month
- Cash-flow timeline (daily/weekly aggregates)
- Recurring vs variable expenses split
- Per income-stream chart (planned vs actual)

### 2.7 PWA / Responsiveness

- Installable app (manifest)
- Home-screen icon
- Offline-first shell; reads cached data when offline
- Mobile-first layout with smooth transitions

---

## 3. Architecture Overview

### 3.1 Monorepo Layout

```
/
├─ apps/
│  ├─ web/                    # Svelte (SvelteKit) PWA frontend
│  └─ api/                    # Go backend (Lambda)
├─ packages/
│  ├─ ui/                     # Shared Svelte components (buttons, cards, charts)
│  ├─ config/                 # Shared TS config, constants
│  └─ types/                  # Shared TypeScript definitions (mirroring Go structs)
├─ infra/
│  └─ cdk/ or terraform/      # AWS IaC for DynamoDB, Lambda, API Gateway
├─ package.json               # PNPM or Yarn workspaces for JS
├─ pnpm-workspace.yaml
├─ turbo.json                 # (optional) For build orchestration
└─ go.work                    # (optional) For multi-module Go workspace
```

| Layer     | Location        | Tech Stack                                    |
| --------- | --------------- | --------------------------------------------- |
| Frontend  | `apps/web`      | SvelteKit, PWA, GSAP for animations           |
| Backend   | `apps/api`      | Go, serverless handler for API Gateway/Lambda |
| Infra     | `infra/`        | CloudFormation/CDK/Terraform                  |
| Shared    | `packages/*`    | UI components, config, types                  |

### 3.2 AWS Serverless Infrastructure

Minimal but solid AWS architecture:

| Service                   | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| **API Gateway** (HTTP)    | Public entrypoint `/api/v1/*`                     |
| **Lambda** (Go)           | Single "monolith" function serving all routes     |
| **DynamoDB**              | Serverless, on-demand mode for all data           |
| **CloudWatch Events**     | (Optional) Daily scheduled Lambda for recurrings  |

---

## 4. Data Model

> All money values stored as **integer minor units** (e.g., cents) to avoid float issues.

### 4.1 Core Entities

#### User

```json
{
  "id": "uuid",
  "google_sub": "google-oidc-subject",
  "email": "user@example.com",
  "display_name": "Ada Lovelace",
  "avatar_url": "https://...",
  "default_currency": "USD",
  "locale": "en-US",
  "created_at": "ISO8601"
}
```

#### Category

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Restaurants",
  "type": "expense",           // "income" | "expense" | "transfer"
  "color": "#00D1B2",
  "icon": "utensils",          // front-end icon key
  "sort_order": 10,
  "is_archived": false,
  "created_at": "ISO8601"
}
```

#### MonthBudget

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "month": "2025-11",          // YYYY-MM
  "category_id": "uuid",
  "planned_amount_cents": 30000
}
```

#### IncomeStream

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "ACME Salary",
  "default_category_id": "uuid",
  "period": "monthly",         // "monthly" | "biweekly" | "once"
  "expected_amount_cents": 500000,
  "active": true,
  "created_at": "ISO8601"
}
```

#### RecurringRule

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "expense",           // or "income"
  "label": "Netflix",
  "category_id": "uuid",
  "amount_cents": 1599,
  "currency": "USD",
  "interval": "monthly",       // "monthly" | "weekly" | "biweekly"
  "day_of_month": 15,
  "weekday": null,             // for weekly, e.g., "MON"
  "start_date": "2025-01-15",
  "end_date": null,
  "next_occurrence": "2025-02-15",
  "linked_income_stream_id": null
}
```

#### Transaction

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "type": "expense",           // "expense" | "income" | "transfer"
  "income_stream_id": null,
  "recurring_rule_id": null,
  "category_id": "uuid",
  "amount_cents": 1234,
  "currency": "USD",
  "date": "2025-11-23",
  "description": "Coffee with client",
  "merchant": "Blue Bottle",
  "tags": ["client", "coffee"],
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

#### Visualization Preferences (optional)

```json
{
  "user_id": "uuid",
  "default_view": "month",
  "default_chart_type": "donut"
}
```

### 4.2 DynamoDB Tables

| Table             | PK          | SK                                      | Notes                                   |
| ----------------- | ----------- | --------------------------------------- | --------------------------------------- |
| `users`           | `user_id`   | —                                       |                                         |
| `categories`      | `user_id`   | `category_id`                           |                                         |
| `month_budgets`   | `user_id`   | `month#category_id`                     | e.g., `"2025-11#cat-123"`               |
| `transactions`    | `user_id`   | `date#transaction_id`                   | Query current month with `BETWEEN`      |
| `recurring_rules` | `user_id`   | `recurring_id`                          |                                         |
| `income_streams`  | `user_id`   | `income_stream_id`                      |                                         |

**Optional GSI** on `transactions`:
- `GSI1PK`: `user_id#category_id`
- `GSI1SK`: `date#transaction_id`

---

## 5. API Design

> Base path: `/api/v1`

### 5.1 Authentication

**Flow:**

1. Frontend uses Google Identity Services to get an ID token
2. ID token sent to backend via `Authorization: Bearer <id_token>`
3. Backend verifies token against Google's JWKs, extracts `sub`, `email`, `name`, `avatar`
4. Backend upserts User record

**Endpoints:**

| Method | Endpoint         | Description                              |
| ------ | ---------------- | ---------------------------------------- |
| POST   | `/auth/google`   | Exchange Google ID token for app session |

```json
// Request
{ "id_token": "..." }

// Response
{ "token": "<app_jwt>", "user": { ... } }
```

### 5.2 Users & Settings

| Method | Endpoint | Description                     |
| ------ | -------- | ------------------------------- |
| GET    | `/me`    | Returns user profile + settings |
| PATCH  | `/me`    | Update currency, locale, etc.   |

### 5.3 Categories & Budgets

| Method | Endpoint            | Description                    |
| ------ | ------------------- | ------------------------------ |
| GET    | `/categories`       | List all categories            |
| POST   | `/categories`       | Create category                |
| PATCH  | `/categories/:id`   | Update category                |
| DELETE | `/categories/:id`   | Soft delete (archive)          |
| GET    | `/budgets/:month`   | Get budgets for month          |
| PUT    | `/budgets/:month`   | Bulk upsert budgets            |

### 5.4 Income Streams

| Method | Endpoint              | Description          |
| ------ | --------------------- | -------------------- |
| GET    | `/income-streams`     | List income streams  |
| POST   | `/income-streams`     | Create income stream |
| PATCH  | `/income-streams/:id` | Update income stream |
| DELETE | `/income-streams/:id` | Delete income stream |

### 5.5 Recurring Rules

| Method | Endpoint         | Description           |
| ------ | ---------------- | --------------------- |
| GET    | `/recurring`     | List recurring rules  |
| POST   | `/recurring`     | Create recurring rule |
| PATCH  | `/recurring/:id` | Update recurring rule |
| DELETE | `/recurring/:id` | Delete recurring rule |

### 5.6 Transactions

| Method | Endpoint            | Description                                |
| ------ | ------------------- | ------------------------------------------ |
| GET    | `/transactions`     | Query params: `from`, `to`, `category_id`, `income_stream_id`, `limit`, `cursor` |
| POST   | `/transactions`     | Create transaction                         |
| PATCH  | `/transactions/:id` | Update transaction                         |
| DELETE | `/transactions/:id` | Delete transaction                         |

### 5.7 Analytics / Visualizations

| Method | Endpoint                         | Description                      |
| ------ | -------------------------------- | -------------------------------- |
| GET    | `/summary/month/:month`          | Monthly summary with breakdowns  |
| GET    | `/summary/cashflow?from=&to=`    | Aggregated by month or week      |

**Monthly Summary Response:**

```json
{
  "month": "2025-11",
  "income_total_cents": 500000,
  "expense_total_cents": 300000,
  "net_cents": 200000,
  "category_breakdown": [
    { "category_id": "...", "spent_cents": 100000, "planned_cents": 120000 }
  ],
  "recurring_vs_variable": {
    "recurring_expenses_cents": 150000,
    "variable_expenses_cents": 150000
  }
}
```

---

## 6. Backend Design (Go)

### 6.1 Structure

```
apps/api/
├─ cmd/
│  └─ api/
│     └─ main.go              # Lambda entry, HTTP router setup
├─ internal/
│  ├─ http/
│  │  ├─ router.go            # chi/gin routes
│  │  └─ handlers.go
│  ├─ auth/
│  │  └─ google.go            # Token verification
│  ├─ core/
│  │  ├─ users.go
│  │  ├─ transactions.go
│  │  ├─ budgets.go
│  │  └─ recurring.go
│  ├─ storage/
│  │  ├─ dynamo.go            # Client + helpers
│  │  ├─ users_repo.go
│  │  ├─ tx_repo.go
│  │  ├─ budgets_repo.go
│  │  └─ recurring_repo.go
│  └─ config/
│     └─ config.go            # Env vars (table names, etc.)
└─ go.mod
```

### 6.2 Design Principles

- **Router:** Use `chi` or `gin`, adapted to Lambda via `aws-lambda-go/events`
- **Repositories:** Abstract DynamoDB logic; business logic in `core` package
- **Validation:** Struct tags with a validator (or manual checks)
- **Error Model:** Consistent JSON errors: `{ "error": "message", "code": "..." }`

### 6.3 Recurring Job

Scheduled Lambda (CloudWatch Events, 1/day):

1. For each user recurring rule where `next_occurrence <= today`:
   - Create Transaction
   - Update `next_occurrence` based on interval

---

## 7. Infrastructure (IaC)

Located in `/infra`:

### Stacks

| Stack              | Resources                                      |
| ------------------ | ---------------------------------------------- |
| **StorageStack**   | DynamoDB tables                                |
| **ApiStack**       | Lambda function, API Gateway routes, IAM role  |
| **SchedulerStack** | (Optional) CloudWatch rule for recurring job   |

---

## 8. Frontend Design (Svelte PWA)

> SvelteKit app in `apps/web`

### 8.1 Structure

```
apps/web/
├─ src/
│  ├─ routes/
│  │  ├─ +layout.svelte
│  │  ├─ +layout.ts           # Load user, settings
│  │  ├─ +page.svelte         # Dashboard
│  │  ├─ auth/
│  │  │  └─ +page.svelte
│  │  ├─ transactions/
│  │  │  └─ +page.svelte
│  │  ├─ income/
│  │  │  └─ +page.svelte
│  │  ├─ recurring/
│  │  │  └─ +page.svelte
│  │  ├─ budgets/
│  │  │  └─ +page.svelte
│  │  └─ settings/
│  │     └─ +page.svelte
│  ├─ lib/
│  │  ├─ components/          # Shared UI
│  │  ├─ stores/              # Svelte stores
│  │  ├─ api/                 # Fetch wrappers
│  │  └─ animations/          # GSAP helpers
│  ├─ app.html
│  ├─ service-worker.ts
│  └─ manifest.webmanifest
└─ package.json
```

### 8.2 Design System

**Look & Feel:** Tech startup, minimal, geeky, sleek

#### Colors

| Element      | Value                          |
| ------------ | ------------------------------ |
| Background   | Dark slate `#050816` / `#0B1020` |
| Surface      | Slightly lighter panels, subtle borders |
| Primary      | Neon teal/cyan `#00F5D4`       |
| Secondary    | Electric purple                |

#### Typography

| Usage         | Font                   |
| ------------- | ---------------------- |
| Body          | Inter (sans-serif)     |
| Numbers/Code  | JetBrains Mono         |

#### Components

- Card-based layout with subtle shadows
- Rounded corners (not overly soft)
- Generous whitespace and clear grouping

### 8.3 Key Screens

#### 1. Auth / Onboarding

- Clean, single-column layout
- Giant headline, short tagline: *"Stay on top of your month."*
- Centered "Sign in with Google" button
- First login stepper: select currency → confirm categories → initial month budget

#### 2. Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]        ◀ November 2025 ▶           [Avatar Menu]   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Income  │  │  Spent   │  │   Net    │  │ Remaining│    │
│  │  $5,000  │  │  $3,000  │  │  $2,000  │  │   67%    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │   Category Donut    │  │   Income vs Expenses Chart  │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Upcoming Recurring                                         │
│  • Netflix — $15.99 — Dec 15                               │
│  • Rent — $1,500 — Dec 1                                   │
└─────────────────────────────────────────────────────────────┘
```

- Animated number transitions (GSAP) when month changes
- Mobile: vertical stack with swipeable carousel for charts

#### 3. Transactions

- Filter bar: date range picker, category dropdown, search input
- List: amount (colored), category tag, description, date
- Floating "+" button (bottom-right on mobile)
- Inline editing dialog/modal

#### 4. Income Streams

- Cards for each stream with progress bars (planned vs actual)
- Stacked bar chart visualization

#### 5. Recurring Payments

- Timeline/list grouped by next due date
- Toggle on/off per rule
- Quick controls: "Skip next", "Adjust this month"

#### 6. Budgets

- Grid of categories with progress bars
- Color-coded: green (under), orange (near), red (exceeded)
- Quick inline edit of planned amounts

#### 7. Settings

- Currency, locale, first-day-of-month
- Theme toggle (dark/light, default dark)

### 8.4 State Management

Key Svelte stores in `src/lib/stores`:

| Store                   | Purpose                          |
| ----------------------- | -------------------------------- |
| `userStore`             | Current user profile             |
| `authStore`             | Token, auth state                |
| `currentMonthStore`     | Selected month (YYYY-MM)         |
| `settingsStore`         | Currency, theme                  |
| `transactionsStore`     | Cached data per month            |
| `categoriesStore`       | User categories                  |
| `budgetsStore`          | Monthly budgets                  |
| `incomeStreamsStore`    | Income streams                   |
| `recurringStore`        | Recurring rules                  |

Use **derived stores** for computed values (net balance, progress per category).

### 8.5 API Layer

In `src/lib/api`:

- `apiClient.ts` — Base fetch wrapper (auth header, error handling)
- `transactions.ts`, `budgets.ts`, etc. — Domain-specific modules

---

## 9. Animations (GSAP)

Located in `src/lib/animations`:

| Module               | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `pageTransition.ts`  | Fade + Y-translate on route navigation    |
| `cardEntrance.ts`    | Staggered card entry for metrics/lists    |
| `numberCounter.ts`   | Animate numeric values on store changes   |
| `chartEntrance.ts`   | Scale/opacity on chart initial render     |

### Guidelines

- Keep animations **300ms–500ms** max
- Use "techy" easing (e.g., `Power2.out`)
- Respect `prefers-reduced-motion` — disable heavy animations if set

---

## 10. PWA & Responsive Behavior

### 10.1 PWA Essentials

**manifest.webmanifest:**
- Name, short_name, icons (192/512)
- `theme_color`, `background_color`
- `"display": "standalone"`
- `"orientation": "portrait-primary"`

**service-worker.ts:**
- Precache app shell and static assets
- Runtime caching for API calls (stale-while-revalidate for GETs)
- Offline fallback: show last cached month summary

### 10.2 Offline Strategy

| Scenario            | Behavior                                    |
| ------------------- | ------------------------------------------- |
| Read-only dashboard | Works from cached API responses (IndexedDB) |
| New transactions    | Stored locally with `pending_sync` flag     |
| Sync                | Background sync or on next online event     |

### 10.3 Responsive Breakpoints

| Breakpoint    | Layout                                              |
| ------------- | --------------------------------------------------- |
| `≤ 640px`     | **Mobile:** Single column, bottom nav               |
| `641–1024px`  | **Tablet:** Two-column, collapsible sidebar         |
| `> 1024px`    | **Desktop:** Sidebar always visible, multi-column   |

Use CSS Grid/Flex with utility classes (Tailwind or custom).

---

## 11. Security & Privacy

| Area             | Approach                                           |
| ---------------- | -------------------------------------------------- |
| **Auth**         | Google Sign-In only (no passwords)                 |
| **Transport**    | Enforce HTTPS everywhere                           |
| **Data Isolation** | Every DynamoDB query scoped to `user_id` from token |
| **CORS**         | Lock API to allowed origins                        |
| **Secrets**      | API keys via environment variables / SSM           |
| **Logging**      | No PII, no full tokens — only request IDs & events |

---

## 12. Developer Experience

### Frontend

- ESLint + Prettier + TypeScript
- Vitest / Playwright for tests

### Backend

- `go test ./...`
- Lint with `golangci-lint`

### CI/CD Pipeline

| Trigger   | Actions                                            |
| --------- | -------------------------------------------------- |
| On push   | Run tests + lint                                   |
| On main   | Deploy: infra → frontend (S3 + CloudFront) → backend (Lambda) |
