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

## Apply the migration

```bash
npx prisma validate
npx prisma generate
npx prisma migrate deploy
```

For local development where migrations are normally created locally, inspect the committed SQL migration first, then use your usual migration deployment workflow.
