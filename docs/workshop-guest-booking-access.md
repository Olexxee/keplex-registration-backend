# Workshop guest booking access

## Change

Guest workshop bookings now receive a cryptographically random 32-byte access token. The API returns the token once at booking creation and persists only its SHA-256 hash. The public booking reference is not an access credential.

Guests retrieve a booking with both values:

`GET /api/workshops/bookings/access/:reference/:token`

A missing, malformed, mismatched, or legacy booking credential returns the standard not-found response. The guest response excludes internal admin notes and database identifiers.

## Migration

Migration: `20261111120000_add_workshop_guest_access`

The new `WorkshopBooking.accessTokenHash` column is nullable to preserve existing booking rows. New bookings always receive a unique hash. Legacy bookings without a hash cannot use the guest retrieval endpoint; they remain accessible through the existing admin workspace.

Apply with `npx prisma migrate deploy`, then regenerate Prisma Client with `npx prisma generate`.

## Security properties

- Token: 32 random bytes, encoded as 64 hexadecimal characters.
- Storage: SHA-256 hash only; raw token is returned once.
- Retrieval: requires the exact public reference and matching token hash.
- Response: no access-token hash, internal admin notes, or internal booking ID.
- Existing admin endpoints and guest-only booking creation remain unchanged.

## Verification

Run `npm test`. The workshop validation tests cover valid credentials, missing references, short tokens, and malformed tokens.
