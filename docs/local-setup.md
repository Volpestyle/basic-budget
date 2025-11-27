# Local Development Setup

## Prerequisites

- Node.js 20+
- pnpm 9+
- Go 1.21+
- Docker
- AWS CLI (for DynamoDB table creation)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start DynamoDB Local
pnpm db:start

# 3. Create tables (wipes + recreates all local tables)
pnpm db:init

# 4. Set up environment files
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
# Edit both .env files with your values

# 5. Run the app (in separate terminals)
pnpm dev:api   # Backend on :8080
pnpm dev:web   # Frontend on :5173
```

## Environment Variables

### Frontend (`apps/web/.env`)

| Variable                | Description                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `VITE_API_URL`          | Backend API URL (default: `http://localhost:8080/api/v1`)                                             |

### Backend (`apps/api/.env`)

| Variable                | Description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`      | Same Google OAuth Client ID as frontend                           |
| `JWT_SECRET`            | Secret for signing JWTs. Generate with: `openssl rand -base64 32` |
| `PORT`                  | Server port (default: `8080`)                                     |
| `DYNAMODB_ENDPOINT`     | DynamoDB endpoint (default: `http://localhost:8000` for local)    |
| `AWS_ACCESS_KEY_ID`     | Any value works for local (e.g., `local`)                         |
| `AWS_SECRET_ACCESS_KEY` | Any value works for local (e.g., `local`)                         |
| `AWS_REGION`            | AWS region (default: `us-east-1`)                                 |

## Commands

| Command         | Description                       |
| --------------- | --------------------------------- |
| `pnpm dev:web`  | Start SvelteKit frontend on :5173 |
| `pnpm dev:api`  | Start Go backend on :8080         |
| `pnpm db:start` | Start DynamoDB Local (Docker)     |
| `pnpm db:stop`  | Stop DynamoDB Local               |
| `pnpm db:init`  | Reset + recreate DynamoDB tables locally (wipes data) |
| `pnpm build`    | Build all packages                |
| `pnpm lint`     | Lint all packages                 |
| `pnpm format`   | Format code with Prettier         |

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID (Web application)
3. Add Authorized JavaScript origins:
   - `http://localhost:5173` (local dev)
   - Your production domain
4. No redirect URIs needed (using Google Identity Services)
5. Copy the Client ID to both `.env` files

## Architecture

```
apps/
  web/          # SvelteKit frontend (PWA)
  api/          # Go backend (Lambda-ready)
infra/          # AWS CDK infrastructure
packages/
  types/        # Shared TypeScript types
  config/       # Shared configs
```

## Troubleshooting

### DynamoDB connection errors

Make sure Docker is running and DynamoDB Local is started:

```bash
pnpm db:start
docker ps  # Should show basic-budget-dynamodb container
```

### Tables don't exist

Run the init script (note: this clears and recreates tables):

```bash
pnpm db:init
```

### AWS credentials error

For local development, set dummy credentials in `apps/api/.env`:

```
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
AWS_REGION=us-east-1
```
