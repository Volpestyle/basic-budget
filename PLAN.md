# Basic Budget - Implementation Plan

Based on [design-spec.md](design-spec.md), this plan outlines the implementation phases for the monthly budgeting PWA.

---

## Phase 1: Project Foundation & Monorepo Setup

### 1.1 Initialize Monorepo Structure
- Create directory structure:
  ```
  /
  ├─ apps/
  │  ├─ web/           # SvelteKit PWA
  │  └─ api/           # Go Lambda backend
  ├─ packages/
  │  ├─ ui/            # Shared Svelte components
  │  ├─ config/        # Shared TS config
  │  └─ types/         # Shared TypeScript definitions
  └─ infra/            # AWS CDK
  ```
- Initialize `pnpm-workspace.yaml` for JS workspace management
- Initialize `go.work` for Go multi-module workspace
- Create root `package.json` with workspace scripts
- Set up `turbo.json` for build orchestration

### 1.2 Configure Development Tooling
- ESLint + Prettier configuration for frontend
- TypeScript strict mode configuration
- golangci-lint configuration for Go backend
- Git hooks (husky) for pre-commit linting

---

## Phase 2: Infrastructure (AWS CDK)

### 2.1 CDK Project Setup
- Initialize CDK project in `infra/`
- Configure AWS SDK and CDK dependencies
- Set up environment configuration (dev/prod)

### 2.2 Storage Stack - DynamoDB Tables
Create tables with on-demand billing:
| Table | PK | SK | GSI |
|-------|----|----|-----|
| `users` | `user_id` | — | — |
| `categories` | `user_id` | `category_id` | — |
| `month_budgets` | `user_id` | `month#category_id` | — |
| `transactions` | `user_id` | `date#transaction_id` | `user_id#category_id` → `date#transaction_id` |
| `recurring_rules` | `user_id` | `recurring_id` | — |
| `income_streams` | `user_id` | `income_stream_id` | — |

### 2.3 API Stack
- Lambda function (Go runtime)
- API Gateway HTTP API with `/api/v1/*` routes
- IAM role with DynamoDB permissions
- CORS configuration for frontend origin

### 2.4 Scheduler Stack (Optional)
- CloudWatch Events rule for daily recurring job

---

## Phase 3: Backend API (Go)

### 3.1 Project Structure
```
apps/api/
├─ cmd/api/main.go           # Lambda entry point
├─ internal/
│  ├─ http/
│  │  ├─ router.go           # Chi router setup
│  │  └─ handlers/           # Route handlers
│  ├─ auth/google.go         # Google token verification
│  ├─ core/                  # Business logic
│  ├─ storage/               # DynamoDB repositories
│  └─ config/config.go       # Environment configuration
└─ go.mod
```

### 3.2 Core Dependencies
- `github.com/go-chi/chi/v5` - HTTP router
- `github.com/aws/aws-lambda-go` - Lambda runtime
- `github.com/aws/aws-sdk-go-v2` - DynamoDB client
- `github.com/golang-jwt/jwt/v5` - JWT handling

### 3.3 Authentication Implementation
1. POST `/auth/google` - Exchange Google ID token for app JWT
2. Google token verification against Google JWKs
3. User upsert on first login
4. JWT middleware for protected routes

### 3.4 API Endpoints (in order of implementation)

**Auth & User:**
- `POST /auth/google` - Login/register with Google
- `GET /me` - Get current user profile
- `PATCH /me` - Update user settings

**Categories:**
- `GET /categories` - List user categories
- `POST /categories` - Create category
- `PATCH /categories/:id` - Update category
- `DELETE /categories/:id` - Archive category

**Budgets:**
- `GET /budgets/:month` - Get monthly budgets
- `PUT /budgets/:month` - Bulk upsert budgets

**Income Streams:**
- `GET /income-streams` - List income streams
- `POST /income-streams` - Create stream
- `PATCH /income-streams/:id` - Update stream
- `DELETE /income-streams/:id` - Delete stream

**Recurring Rules:**
- `GET /recurring` - List recurring rules
- `POST /recurring` - Create rule
- `PATCH /recurring/:id` - Update rule
- `DELETE /recurring/:id` - Delete rule

**Transactions:**
- `GET /transactions` - List with filters (from, to, category_id, etc.)
- `POST /transactions` - Create transaction
- `PATCH /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction

**Analytics:**
- `GET /summary/month/:month` - Monthly summary with breakdowns
- `GET /summary/cashflow` - Aggregated cash flow data

### 3.5 Recurring Job Lambda
- Separate handler for CloudWatch Events trigger
- Query all rules where `next_occurrence <= today`
- Create transactions and update `next_occurrence`

---

## Phase 4: Frontend (SvelteKit PWA)

### 4.1 SvelteKit Project Setup
- Initialize SvelteKit with TypeScript
- Configure Vite for PWA (vite-plugin-pwa)
- Set up Tailwind CSS with custom design tokens
- Configure path aliases

### 4.2 Design System Implementation
**Colors:**
- Background: `#050816` / `#0B1020`
- Primary: `#00F5D4` (neon teal)
- Secondary: Electric purple

**Typography:**
- Body: Inter
- Numbers/Code: JetBrains Mono

**Components (`packages/ui/`):**
- Button, Card, Input, Modal
- CategoryTag, AmountDisplay
- ProgressBar, DonutChart, BarChart

### 4.3 Core Infrastructure
**API Client (`src/lib/api/`):**
- `apiClient.ts` - Base fetch with auth headers
- Domain modules: `auth.ts`, `transactions.ts`, `budgets.ts`, etc.

**Stores (`src/lib/stores/`):**
- `authStore` - Token & auth state
- `userStore` - Current user profile
- `currentMonthStore` - Selected month (YYYY-MM)
- `categoriesStore` - User categories
- `transactionsStore` - Cached transactions
- `budgetsStore` - Monthly budgets
- `incomeStreamsStore` - Income streams
- `recurringStore` - Recurring rules

### 4.4 Routes & Pages

**Authentication:**
- `/auth` - Google Sign-In page
- First-login onboarding stepper

**Main App:**
- `/` - Dashboard (summary cards, charts, upcoming recurring)
- `/transactions` - Transaction list with filters, add/edit modal
- `/income` - Income streams management
- `/recurring` - Recurring payments management
- `/budgets` - Category budgets grid
- `/settings` - User preferences

### 4.5 Animations (GSAP)
`src/lib/animations/`:
- `pageTransition.ts` - Route navigation animations
- `cardEntrance.ts` - Staggered card entry
- `numberCounter.ts` - Animated number transitions
- `chartEntrance.ts` - Chart appearance animations

**Guidelines:**
- 300-500ms duration
- Respect `prefers-reduced-motion`

### 4.6 PWA Configuration
- `manifest.webmanifest` with icons, theme color
- Service worker with:
  - Precache app shell
  - Runtime caching (stale-while-revalidate for API)
  - Offline fallback

### 4.7 Responsive Layout
- Mobile (≤640px): Single column, bottom nav
- Tablet (641-1024px): Two-column, collapsible sidebar
- Desktop (>1024px): Persistent sidebar, multi-column

---

## Phase 5: Integration & Polish

### 5.1 End-to-End Testing
- Playwright tests for critical flows
- Auth flow, transaction CRUD, budget management

### 5.2 Offline Support
- IndexedDB for local transaction queue
- Background sync for pending transactions
- Offline dashboard from cached data

### 5.3 CI/CD Pipeline
- GitHub Actions workflow:
  - On push: Lint + test
  - On main: Deploy infra → backend → frontend

---

## Implementation Order Summary

| Step | Component | Key Deliverable |
|------|-----------|-----------------|
| 1 | Monorepo | Working project structure with tooling |
| 2 | Infra | DynamoDB tables deployed |
| 3 | Backend Auth | Google login working |
| 4 | Backend CRUD | All API endpoints functional |
| 5 | Frontend Shell | SvelteKit + design system |
| 6 | Frontend Auth | Google login integrated |
| 7 | Frontend Dashboard | Charts + summary working |
| 8 | Frontend CRUD | All pages functional |
| 9 | PWA | Offline support + installable |
| 10 | Polish | Animations, testing, CI/CD |

---

## Questions for Clarification

Before proceeding, please confirm:

1. **AWS Region**: Which region should be used for deployment?
2. **Domain**: Do you have a domain for the app, or should we use CloudFront defaults initially?
3. **Google OAuth**: Do you have a Google Cloud project set up for OAuth credentials?
4. **Starting Point**: Should I begin with Phase 1 (monorepo setup) or do you want to start elsewhere?
