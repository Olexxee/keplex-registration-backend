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
6. Certificates are recorded before email delivery. If email fails, the certificate remains issued and can be resent.
7. Revoked certificates cannot be resent and public verification reports them as invalid.
8. Proofs and generated PDFs are uploaded to Cloudinary using the authenticated delivery type; admin endpoints return signed access URLs.

## Environment variables

Configure these on the backend host and in local `.env`:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`
- `CERTIFICATE_FROM_EMAIL` — a sender identity verified in Resend

If email configuration is missing or delivery fails, issuance still succeeds and records the delivery error. Configure email before production issuance.


## Certificate document rendering

New certificates are rendered entirely by the backend:

1. The renderer reads the version-controlled decorative SVG at `assets/certificates/kpx-certificate-artwork.svg`.
2. It loads the current official logo from the existing Site Branding record. Only HTTPS assets hosted on `res.cloudinary.com` are fetched; an absent or unavailable logo falls back to a text wordmark.
3. It composes the recipient, programme, issue date, certificate number, QR code and verification link into a data-driven SVG.
4. The backend uploads the temporary SVG as an authenticated Cloudinary image asset and requests a 3508 × 2480 JPEG transformation (A4 landscape at approximately 300 DPI).
5. The backend wraps that JPEG in a single-page A4 landscape PDF and stores the resulting PDF using the existing authenticated raw-file workflow.
6. The temporary SVG asset is deleted after rendering, including when rendering fails.

The current output is a high-resolution, single-page raster PDF: the artwork and text are flattened into the page image, so PDF text selection/accessibility is not available yet. The design uses Sora, Inter and Cormorant Garamond font-family declarations with system fallbacks; those font files are not embedded in this phase. Confirm actual glyph rendering and print output against the reference before claiming the visual target is met.

The QR code points to `FRONTEND_URL/certificates?number=<certificate-number>#verify-certificate`. The KPX Academy frontend certificate page consumes the `number` query parameter, prefills the field, and automatically calls the public verification endpoint. The API verification endpoint remains `GET /verify/:certificateNumber`.

### Resending

Resending uses the already stored authenticated PDF from Cloudinary. It does not re-render the certificate, so changing the academy logo or artwork later cannot silently alter a previously issued certificate when its email is resent.

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
