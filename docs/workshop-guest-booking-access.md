# Workshop guest booking access

## Existing private-link access

New bookings continue to receive a cryptographically random 32-byte access token. The API returns the token once at booking creation and persists only its SHA-256 hash. The public booking reference is not an access credential.

The legacy private-link endpoint remains supported:

`GET /api/workshops/bookings/access/:reference/:token`

Existing private links therefore continue to work.

## Email-verified booking tracker

Guests can also recover access from the public booking reference without creating an account.

1. Request a code with `POST /api/workshops/bookings/track/request` and `{ "reference": "KPX-WKS-..." }`.
2. A six-digit code is queued to the email address stored on that booking. The response is deliberately generic so the endpoint does not reveal whether a reference exists.
3. Verify with `POST /api/workshops/bookings/track/verify` and `{ "reference", "challengeToken", "code" }`.
4. Successful verification issues a random 32-byte session token valid for two hours. The token is stored only as a SHA-256 hash and is accepted by the existing guest booking, proposal-response, and Paystack initialization endpoints.

Verification codes expire after five minutes, are single-use, and allow at most five attempts. Request and verification endpoints have IP-based rate limits. The code hash is salted with the high-entropy challenge token. The email outbox payload is scrubbed after successful delivery or permanent failure; expired codes are not sent by the worker.

Legacy bookings without an access-token hash are supported by this email-verification flow. The guest response continues to exclude internal admin notes and internal database identifiers.

## Migration

Migration: `20261112130000_workshop_guest_email_access`

Apply the migration only after a verified database backup and staging validation:

```bash
npx prisma migrate deploy
npx prisma generate
```

Do not apply this migration manually with ad hoc SQL. The repository owner applies production migrations.

## Verification

Run `npm test`. Workshop validation tests cover the reference format, normalization, challenge-token length, and six-digit code format.
