# Security & Privacy

## Privacy posture (recommended)
- Local-first: user data stays on device by default
- If cloud sync is added, make it opt-in with clear consent
- If bank integration is added, explain:
  - what data is accessed (transactions, account names/masks)
  - what is not accessed (credentials)
  - how revocation works

## Data protection on device
- Store sensitive tokens/keys in `expo-secure-store`
- Use OS-level device encryption (iOS/Android) as baseline
- Optional: app lock via biometrics/passcode

## Backend security (if used)
- HTTPS only
- Principle of least privilege
- Encrypt bank provider access tokens at rest
- Restrict logs: never log full transaction payloads if avoidable
- Webhook signature verification

## Threat model (high level)
- Stolen phone:
  - mitigated by OS lock + optional app lock
- Malicious app reading storage:
  - mitigated by secure store and OS sandbox
- Token leakage from backend:
  - mitigated by encryption, access controls, secret management
- User privacy concerns:
  - mitigated by transparency + local-first default

## Compliance notes (bank integration)
- Provider terms often require:
  - secure token handling
  - data retention limits
  - user consent and ability to disconnect
- If you store any PII, prepare:
  - privacy policy
  - data deletion process
  - support contact
