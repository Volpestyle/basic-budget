# Basic Budget API

High-performance REST API built with Bun and Hono for the Basic Budget application.

## Features

- **OAuth Authentication**: Google OAuth 2.0 with JWT tokens
- **Plaid Integration**: Bank account linking and transaction syncing
- **Budget Management**: CRUD operations for monthly budget plans
- **Transaction Tracking**: Automatic categorization and manual entry
- **Paystub Processing**: File upload and data extraction
- **Performance Optimized**: Sub-10ms response times with Redis caching
- **Security First**: Rate limiting, CORS, secure headers, JWT validation

## Tech Stack

- **Runtime**: Bun (for native performance)
- **Framework**: Hono (lightweight and fast)
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis (optional, falls back gracefully)
- **Storage**: AWS S3 or local filesystem
- **Authentication**: JWT with refresh tokens

## Setup

1. Install dependencies:
```bash
bun install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up database:
```bash
bun run db:push  # Development
bun run db:migrate:prod  # Production
```

4. Start the server:
```bash
bun run dev  # Development with hot reload
bun start    # Production
```

## API Endpoints

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user
- `DELETE /auth/account` - Delete account

### Budgets
- `GET /budgets` - List budgets
- `GET /budgets/current` - Get current month's budget
- `GET /budgets/:id` - Get specific budget
- `POST /budgets` - Create budget
- `PUT /budgets/:id` - Update budget
- `DELETE /budgets/:id` - Delete budget
- `POST /budgets/:id/categories` - Add category
- `PUT /budgets/:id/categories/:categoryId` - Update category
- `DELETE /budgets/:id/categories/:categoryId` - Delete category
- `POST /budgets/:id/duplicate` - Duplicate budget

### Transactions
- `GET /transactions` - List transactions (with filtering)
- `GET /transactions/summary` - Get transaction summary
- `GET /transactions/:id` - Get specific transaction
- `POST /transactions` - Create manual transaction
- `PUT /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction
- `POST /transactions/:id/categorize` - Categorize transaction
- `DELETE /transactions/:id/categorize/:categoryId` - Remove category
- `POST /transactions/bulk-categorize` - Bulk categorize

### Plaid Integration
- `POST /plaid/link/token` - Create Link token
- `POST /plaid/link/exchange` - Exchange public token
- `GET /plaid/accounts` - Get connected accounts
- `POST /plaid/accounts/:itemId/sync` - Sync accounts
- `POST /plaid/transactions/sync` - Sync transactions
- `DELETE /plaid/items/:itemId` - Remove Plaid item
- `POST /plaid/webhook` - Webhook endpoint
- `GET /plaid/categories` - Get Plaid categories
- `POST /plaid/items/:itemId/refresh` - Force refresh

### Paystubs
- `GET /paystubs` - List paystubs
- `GET /paystubs/summary` - Get paystub summary
- `GET /paystubs/:id` - Get specific paystub
- `POST /paystubs/upload` - Upload paystub
- `POST /paystubs/upload-url` - Get presigned upload URL
- `PUT /paystubs/:id` - Update paystub data
- `DELETE /paystubs/:id` - Delete paystub

### Monitoring
- `GET /health` - Health check
- `GET /metrics` - Performance metrics

## Authentication Modes

The API supports two modes:

1. **Authenticated Mode**: Full OAuth flow with Google
2. **Anonymous Mode**: Use `X-Anonymous-Id` header with format `anon_[21-char-id]`

## Performance Optimizations

- **Connection Pooling**: Optimized database connections
- **Redis Caching**: 30-60 second cache for frequently accessed data
- **Query Optimization**: Indexed queries and selective field fetching
- **Response Streaming**: For large payloads
- **Compression**: Gzip compression for responses
- **Rate Limiting**: Sliding window rate limiting per endpoint

## Security Features

- **JWT Validation**: Access tokens with 15-minute expiry
- **Refresh Tokens**: 7-day refresh tokens
- **Session Management**: 30-day sessions with revocation
- **CORS Protection**: Configured for frontend URL
- **Rate Limiting**: Per-endpoint limits
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Protection**: Parameterized queries via Prisma
- **Secure Headers**: HSTS, CSP, X-Frame-Options, etc.

## Deployment

### AWS Lambda

The API is compatible with AWS Lambda:

```javascript
import app from './src/index';
export const handler = app.fetch;
```

### Docker

```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
CMD ["bun", "run", "dist/index.js"]
```

### Direct Deployment

```bash
bun run build
bun run dist/index.js
```

## Monitoring

Access metrics at `/metrics` endpoint:
- Request count and error rate
- Response time percentiles (p95, p99)
- Top endpoints by usage
- Per-endpoint performance stats

## Environment Variables

See `.env.example` for all required environment variables.

## License

MIT