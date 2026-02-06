# CI/CD (Expo)

## Tooling
- Expo EAS Build + EAS Submit
- GitHub Actions (or similar)
- Linting: ESLint + Prettier
- Type checking: `tsc --noEmit`
- Tests: Jest + React Native Testing Library

## Branch strategy
- `main` – production
- `develop` – staging
- feature branches

## Pipelines

### PR pipeline
- Install dependencies
- Lint
- Type check
- Unit tests
- (Optional) build preview via EAS

### Staging deploy
- EAS build (internal distribution)
- Release channel: `staging`
- OTA updates enabled (carefully—see below)

### Production deploy
- Version bump
- EAS build + submit
- Release channel: `production`

## OTA updates guidance
- Safe for JS/asset changes
- Avoid OTA for:
  - schema migrations that require native changes
  - major behavior changes without migration safeguards
