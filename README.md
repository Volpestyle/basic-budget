# Basic Budget

A modern, geeky monthly budgeting app with a sleek dark interface.

## Overview

Basic Budget helps you stay on top of your finances with:

- **Income tracking** — Multiple streams (salary, freelance, rental)
- **Transaction logging** — Quick capture with categories, tags, and merchants
- **Recurring payments** — Auto-generated expenses and incomes
- **Category budgets** — Monthly limits with progress visualization
- **Rich analytics** — Donut charts, bar graphs, cash flow timelines
- **PWA support** — Install on any device, works offline

## Tech Stack

| Layer      | Technology                        |
| ---------- | --------------------------------- |
| Frontend   | SvelteKit, GSAP, TypeScript       |
| Backend    | Go (Lambda)                       |
| Database   | DynamoDB                          |
| Infra      | AWS CDK / Terraform               |
| Auth       | Google Sign-In (OIDC)             |

## Project Structure

```
/
├─ apps/
│  ├─ web/           # SvelteKit PWA frontend
│  └─ api/           # Go serverless backend
├─ packages/
│  ├─ ui/            # Shared Svelte components
│  ├─ config/        # Shared configuration
│  └─ types/         # Shared TypeScript types
├─ infra/            # AWS infrastructure (CDK/Terraform)
└─ design-spec.md    # Full design specification
```

## Getting Started

### Prerequisites

- Node.js 20+
- Go 1.21+
- pnpm
- AWS CLI (configured)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/basic-budget.git
cd basic-budget

# Install dependencies
pnpm install

# Install Go dependencies
cd apps/api && go mod download && cd ../..
```

### Development

```bash
# Start the frontend dev server
pnpm --filter web dev

# Run the API locally
cd apps/api && go run ./cmd/api
```

### Build

```bash
# Build frontend
pnpm --filter web build

# Build API
cd apps/api && go build -o bin/api ./cmd/api
```

## Documentation

See [design-spec.md](design-spec.md) for the full design specification including:

- Data models and DynamoDB schema
- API endpoints and authentication flow
- Frontend architecture and state management
- UI/UX design system
- PWA and offline strategy
- Security considerations

## Design

**Theme:** Dark, minimal, geeky

| Element     | Value                    |
| ----------- | ------------------------ |
| Background  | `#050816`                |
| Surface     | `#0B1020`                |
| Primary     | `#00F5D4` (neon teal)    |
| Typography  | Inter + JetBrains Mono   |

## License

MIT
