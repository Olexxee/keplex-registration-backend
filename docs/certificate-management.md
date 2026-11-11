# Certificate Management API

Base path: `/api/certificates`

All `/admin/*` routes require the existing admin authentication middleware and the `ADMIN` or `SUPER_ADMIN` role. Public proof submissions require a proof file. A registration match is informational only and never controls eligibility.

## Student proof submission

`POST /submissions` — `multipart/form-data`

Fields:
- `studentName` (required)
- `studentEmail` (required)
- `trainingProgramId` (required; existing training programme)
- `notes` (optional)
- `proof` (required file; PDF/JPEG/PNG/WebP, maximum 10 MB)

The API normalizes the email and checks the Registration table using programme + email. A match is saved as `registrationId`; no match is allowed. Duplicate pending/approved submissions for the same programme and email are rejected.

Example:
```bash
curl -X POST http://localhost:3000/api/certificates/submissions ^
  -F "studentName=Example Student" ^
  -F "studentEmail=student@example.com" ^
  -F "trainingProgramId=YOUR_PROGRAM_ID" ^
  -F "notes=Final project submission" ^
  -F "proof=@C:\\path\\to\\proof.pdf"
```

## Admin endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/submissions?status=PENDING&page=1&limit=20&search=` | List proof submissions |
| GET | `/admin/submissions/:id` | Submission detail and signed proof URL |
| PATCH | `/admin/submissions/:id/review` | Approve or reject proof |
| POST | `/admin/submissions/:id/issue` | Issue certificate for an approved submission |
| POST | `/admin/issue` | Direct issue without a registration lookup |
| GET | `/admin?status=ISSUED&page=1&limit=20&search=` | List certificates |
| GET | `/admin/:id` | Certificate detail and signed PDF URL |
| POST | `/admin/:id/resend` | Resend the certificate email |
| PATCH | `/admin/:id/revoke` | Revoke an issued certificate |

Review body:
```json
{ "status": "APPROVED", "reviewNotes": "Proof reviewed and accepted." }
```

Direct issuance body (no registration record is searched or required):
```json
{
  "studentName": "Historical Student",
  "studentEmail": "student@example.com",
  "trainingProgramTitle": "Resin Art Masterclass"
}
```

If `trainingProgramId` is also supplied to direct issuance, the API validates that programme ID and uses the programme's current title snapshot; it still does not look up a registration.

Revocation body:
```json
{ "reason": "Certificate issued in error." }
```

## Public verification

`GET /verify/:certificateNumber`

Returns the certificate number, recipient name, programme title, issue date, and validity/revocation state. It does not expose the recipient's email or private document URL.

## Workflow rules

1. A proof submission starts as `PENDING`.
2. Only pending submissions can be reviewed.
3. Only `APPROVED` submissions can be issued.
4. Direct admin issuance does not require a submission or registration match.
5. An active certificate for the same email + programme title prevents accidental duplicate issuance.
6. Certificate creation and its initial one-recipient email job are saved in one database transaction after the PDF upload. Delivery failure never revokes the issued certificate; the worker retries transient failures, and an admin can create a new resend action after a job reaches DEAD.
7. Revoked certificates cannot be resent and public verification reports them as invalid.
8. Proofs and generated PDFs are uploaded to Cloudinary using the authenticated delivery type; admin endpoints return signed access URLs.

## Environment variables

Configure these on the backend host and in local `.env`:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`
- `CERTIFICATE_FROM_EMAIL` — a sender identity verified in Resend
- `EMAIL_OUTBOX_WORKER_ENABLED` — set to `true` on the Render delivery service; keep `false` for local development to prevent a local process from competing with production email delivery.
- `EMAIL_OUTBOX_POLL_INTERVAL_MS` — defaults to 5000 milliseconds.
- `EMAIL_OUTBOX_MAX_ATTEMPTS` — defaults to 8.

Certificate issuance requires the PDF renderer and Cloudinary storage to succeed. Email delivery is asynchronous: issuance can succeed and the message remain queued while the worker is unavailable. Configure the Resend sender and enable the worker on the delivery host before production issuance. Each certificate delivery job targets exactly one student email address; there is no bulk-recipient mode. Network retries reuse one provider idempotency key, while a later deliberate resend is a distinct send action. The backend permits at most one PENDING or PROCESSING delivery job per certificate at a time.


## Certificate document rendering

New certificates are rendered entirely by the backend:

1. The renderer reads the version-controlled decorative SVG at `assets/certificates/kpx-certificate-artwork.svg`.
2. It loads the current official logo from the existing Site Branding record. Only HTTPS assets hosted on `res.cloudinary.com` are fetched; an absent or unavailable logo falls back to a text wordmark.
3. It composes the recipient, programme, issue date, certificate number, QR code and verification link into a data-driven SVG.
4. The backend uploads the temporary SVG as an authenticated Cloudinary image asset and requests a 3508 × 2480 JPEG transformation (A4 landscape at approximately 300 DPI).
5. The backend wraps that JPEG in a single-page A4 landscape PDF and stores the resulting PDF using the existing authenticated raw-file workflow.
6. The temporary SVG asset is deleted after rendering, including when rendering fails.

The output is a high-resolution, single-page raster PDF: the artwork and text are flattened into the page image, so PDF text selection/accessibility is not available yet. The design uses Sora, Inter and Cormorant Garamond font-family declarations with system fallbacks; those font files are not embedded in this phase. Confirm actual glyph rendering and print output against the reference before claiming the visual target is met.

The QR code points to `FRONTEND_URL/certificates?number=<certificate-number>#verify-certificate`. The KPX Academy frontend certificate page consumes the `number` query parameter, prefills the field, and automatically calls the public verification endpoint. The API verification endpoint remains `GET /verify/:certificateNumber`.

### Email delivery and resending

Certificate email delivery uses the shared PostgreSQL-backed email outbox. Certificate issuance stores the certificate record and its first delivery job in the same database transaction after the PDF has been uploaded. A resend creates one new delivery job for that certificate. The queue payload stores only the certificate reference; the worker retrieves the exact authenticated PDF already stored for the certificate at send time.

Each job targets exactly one recipient: the email address stored on that certificate. There is no class list or bulk-recipient mode. The admin resend endpoint accepts an `Idempotency-Key` header. The frontend generates a fresh UUID for each deliberate resend click; repeated requests with that same key resolve to the same queue job. A later, deliberate click is a separate action.

The embedded worker processes one job per polling cycle. A PostgreSQL transaction-level advisory lock is held across the full delivery operation, so only one process can send an outbox message at a time, even if more than one application process is running. The worker also locks the certificate row while checking its status and sending, serializing delivery against revocation. Provider requests use an idempotency key derived from the persisted outbox job ID, so worker retries reuse the same provider key. This reduces duplicates after a timeout or process failure; it does not guarantee inbox delivery or absolute exactly-once delivery.

The latest delivery state is exposed to authenticated certificate admins:
- `PENDING` — queued for delivery.
- `PROCESSING` — currently being delivered.
- `SENT` — Resend accepted the message.
- `DEAD` — the configured retry limit was reached or the job failed permanently.

`emailSentAt` records the latest successful provider acceptance. It does not prove that the message reached the recipient's inbox. A later failed resend does not erase the timestamp of an earlier accepted email; the latest queue state and error explain the more recent attempt.

The admin API returns `202 Accepted` when a resend has been queued. A successful issue operation returns the issued certificate plus `emailQueued: true`; the UI reports that the message is queued rather than claiming it has already been sent.

Resending tries the exact secure URL saved at upload time, then builds a new signed raw-asset URL from the stored public ID. The fallback preserves the Cloudinary upload version parsed from the stored trusted URL, ensuring it addresses the same PDF asset version. Raw Cloudinary public IDs already include their file extension, so the URL builder must not append a second extension. Resending never re-renders a certificate.


### Renderer operations

- The backend needs the existing Cloudinary credentials and permission to create authenticated image assets and perform image transformations.
- Temporary render assets are stored under `kpx/certificate-renders` and deleted after use.
- Final certificate PDFs remain under `kpx/certificates` as authenticated raw assets.
- A Cloudinary transformation failure prevents issuance before the certificate database record is created. The admin can retry after resolving the rendering issue.

## Apply the migration

```bash
npx prisma validate
npx prisma generate
npx prisma migrate deploy
```

For local development where migrations are normally created locally, inspect the committed SQL migration first, then use your usual migration deployment workflow.


### Protected founder signature

The founder signature is supplied to the renderer through the backend-only `CERTIFICATE_SIGNATURE_BASE64` environment variable. The value must be base64-encoded PNG data (maximum decoded size 2 MB). The renderer validates the PNG signature before use and fails issuance if the secret is absent or invalid. The original signature is not committed to the repository, returned by any API, or hosted at a public URL.

The signature is a visible authenticity element only. It is not a cryptographic PDF signature and does not prevent modification of an issued PDF. Cryptographic signing and tamper-evident validation are a separate security phase.


## Certificate email outbox migration

Apply `prisma/migrations/20261111170000_certificate_email_outbox` before deploying the outbox-aware certificate API. It adds the `CERTIFICATE_DELIVERY` outbox type and optional certificate foreign key. No existing training or workshop outbox records are rewritten.

Deploy with:

```bash
npx prisma migrate deploy
npx prisma generate
```

After the migration is present in the target database, set `EMAIL_OUTBOX_WORKER_ENABLED=true` on the Render backend service. Leave it `false` in a local environment. The same embedded worker continues to process training and workshop notification jobs as well as certificate delivery.
